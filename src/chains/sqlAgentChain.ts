import { ChatOpenAI } from "@langchain/openai";
import { SqlDatabase } from "langchain/sql_db";
import { createSqlAgent, SqlToolkit } from "langchain/agents/toolkits/sql";
import { AgentExecutor } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { Client } from "pg";


// 用 singleton 避免重複 connect
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
await pgClient.connect();

interface QueryResult {
  question: string;
  query: string;
  data: any[];
  summary: string;
}

class SQLAnalysisAgent {
  private llm: ChatOpenAI;
  private db: SqlDatabase;
  private agent: AgentExecutor;
  private summaryChain: RunnableSequence;
  private pgClient: Client;

  constructor(
    pgClient: Client,
    openaiApiKey: string,
    modelName: string = "gpt-3.5-turbo"
  ) {
    this.pgClient = pgClient;

    // 設定 OpenAI LLM
    this.llm = new ChatOpenAI({
      model: modelName,
      temperature: 0,
      apiKey: openaiApiKey,
    });

    this.initializeAgent();
  }

  private async initializeAgent(): Promise<void> {
    try {
      // 創建 LangChain SQL Database (使用 PostgreSQL 連接字串)
      this.db = await SqlDatabase.fromDataSourceParams({
        appDataSource: {
          type: "postgres",
          url: process.env.DATABASE_URL,
        },
      });

      // 創建 SQL Toolkit 和 Agent (最新架構)
      const toolkit = new SqlToolkit(this.db, this.llm);
      this.agent = createSqlAgent(this.llm, toolkit, {
        verbose: true,
      });

      // 創建總結用的 Chain (使用新的 Runnable 架構)
      const summaryPrompt = PromptTemplate.fromTemplate(`
基於以下查詢結果，請提供一個清晰、簡潔的中文總結：

原始問題: {question}
執行的 SQL 查詢: {query}
查詢結果:
{data}

請提供：
1. 資料的主要發現
2. 重要的數字或趨勢  
3. 對原始問題的直接回答
4. 如果有異常或需要注意的地方

總結:`);

      this.summaryChain = RunnableSequence.from([
        summaryPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      console.log("✅ SQL Analysis Agent 初始化完成");
    } catch (error) {
      console.error("❌ Agent 初始化失敗:", error);
      throw error;
    }
  }

  /**
   * 執行自然語言查詢並返回總結
   */
  async query(question: string): Promise<QueryResult> {
    try {
      console.log(`🔍 處理問題: ${question}`);

      // 使用 SQL Agent 執行查詢
      const agentResult = await this.agent.invoke({
        input: question,
      });

      // 提取執行的 SQL 查詢
      const executedQuery = this.extractSQLFromAgentResult(agentResult.output);

      // 如果 Agent 沒有返回具體的 SQL，嘗試直接執行查詢
      let queryData: any[] = [];
      if (executedQuery) {
        queryData = await this.executeDirectSQL(executedQuery);
      } else {
        // 如果無法提取 SQL，可能 Agent 已經執行了查詢
        queryData = this.extractDataFromAgentResult(agentResult.output);
      }

      // 生成總結
      const summary = await this.summaryChain.invoke({
        question: question,
        query: executedQuery || "由 Agent 自動執行",
        data: JSON.stringify(queryData, null, 2),
      });

      return {
        question,
        query: executedQuery || "由 Agent 自動執行",
        data: queryData,
        summary,
      };
    } catch (error) {
      console.error("❌ 查詢執行失敗:", error);
      throw error;
    }
  }

  /**
   * 直接執行 SQL 查詢 (使用 pg client)
   */
  async executeDirectSQL(sqlQuery: string): Promise<any[]> {
    try {
      console.log(`🔧 執行 SQL: ${sqlQuery}`);
      const result = await this.pgClient.query(sqlQuery);
      return result.rows;
    } catch (error) {
      console.error("❌ SQL 執行失敗:", error);
      return [];
    }
  }

  /**
   * 從 Agent 結果中提取 SQL 查詢
   */
  private extractSQLFromAgentResult(output: string): string {
    // 嘗試多種模式提取 SQL
    const patterns = [
      /```sql\n([\s\S]*?)\n```/i,
      /```\n(SELECT[\s\S]*?)\n```/i,
      /Query:\s*(SELECT[\s\S]*?)(?:\n|$)/i,
      /(SELECT[\s\S]*?;)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return "";
  }

  /**
   * 從 Agent 結果中提取資料
   */
  private extractDataFromAgentResult(output: string): any[] {
    try {
      // 嘗試從輸出中提取 JSON 資料
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果沒有找到 JSON，返回文字描述
      return [{ result: output }];
    } catch (error) {
      return [{ result: output }];
    }
  }

  /**
   * 獲取資料庫表格資訊
   */
  async getTableInfo(): Promise<string> {
    try {
      return await this.db.getTableInfo();
    } catch (error) {
      console.error("❌ 獲取表格資訊失敗:", error);
      return "";
    }
  }

  /**
   * 列出所有表格
   */
  async listTables(): Promise<string[]> {
    try {
      const result = await this.pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error("❌ 列出表格失敗:", error);
      return [];
    }
  }

  /**
   * 獲取表格結構
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    try {
      const result = await this.pgClient.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);
      return result.rows;
    } catch (error) {
      console.error(`❌ 獲取表格 ${tableName} 結構失敗:`, error);
      return [];
    }
  }

  /**
   * 關閉連接
   */
  async close(): Promise<void> {
    // Note: 不在這裡關閉 pgClient，因為它是外部傳入的 singleton
    console.log("🔌 SQL Analysis Agent 已關閉");
  }
}

// 使用範例和工具函數
class DatabaseManager {
  private static instance: Client;

  static async getInstance(): Promise<Client> {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new Client({
        connectionString: process.env.DATABASE_URL,
      });
      await DatabaseManager.instance.connect();
      console.log("✅ PostgreSQL 連接成功");
    }
    return DatabaseManager.instance;
  }

  static async close(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.end();
      console.log("🔌 PostgreSQL 連接已關閉");
    }
  }
}

// 主要執行函數
async function main() {
  let pgClient: Client;

  try {
    // 獲取資料庫連接
    pgClient = await DatabaseManager.getInstance();

    // 初始化 SQL 分析代理
    const agent = new SQLAnalysisAgent(
      pgClient,
      process.env.OPENAI_API_KEY || "your-openai-api-key"
    );

    // 等待 Agent 初始化
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("📋 可用的表格:");
    const tables = await agent.listTables();
    console.log(tables);

    // 如果有表格，顯示第一個表格的結構
    if (tables.length > 0) {
      console.log(`\n📊 表格 '${tables[0]}' 的結構:`);
      const schema = await agent.getTableSchema(tables[0]);
      console.table(schema);
    }

    // 範例查詢
    const questions = [
      "有多少筆資料在第一個表格中？",
      "顯示前10筆記錄",
      "統計每個分類的數量",
      "找出最近建立的記錄"
    ];

    for (const question of questions) {
      console.log("\n" + "=".repeat(60));

      try {
        const result = await agent.query(question);

        console.log(`\n❓ 問題: ${result.question}`);
        console.log(`\n🔧 執行的 SQL:`);
        console.log(result.query);
        console.log(`\n📊 資料筆數: ${result.data.length}`);

        if (result.data.length > 0 && result.data.length <= 5) {
          console.log(`\n📋 查詢結果:`);
          console.table(result.data);
        }

        console.log(`\n🤖 AI 總結:`);
        console.log(result.summary);

      } catch (error) {
        console.error(`❌ 查詢 "${question}" 失敗:`, error.message);
      }
    }

  } catch (error) {
    console.error("❌ 主程序執行失敗:", error);
  } finally {
    // 清理資源
    if (pgClient) {
      await DatabaseManager.close();
    }
  }
}

// 如果直接執行此文件
if (require.main === module) {
  main().catch(console.error);
}

export { SQLAnalysisAgent, DatabaseManager };

// const db = await SqlDatabase.fromPGClient(pgClient, {
//   includeTables: ["ledger"],
// });

// const llm = new ChatOpenAI({
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   model: "gpt-4.1-mini-2025-04-14",
//   temperature: 0,
// });

// const toolkit = new SqlToolkit(db, llm);
// export const sqlAgentChain = createSqlAgent(llm, toolkit);
