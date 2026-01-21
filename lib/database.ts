import pg from 'pg';
const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class DatabaseConnection {
  private pool: PoolType | null = null;
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'nocturna',
      user: process.env.POSTGRES_USER || 'nocturna',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...config
    };
  }

  getPool(): PoolType {
    if (!this.pool) {
      this.pool = new Pool(this.config);
      
      // Handle pool errors
      this.pool.on('error', (err: Error) => {
        console.error('Unexpected error on idle client', err);
      });
    }
    return this.pool;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const pool = this.getPool();
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance for backward compatibility
const dbConnection = new DatabaseConnection();

export function getPostGISPool(): PoolType {
  return dbConnection.getPool();
}

export async function checkDatabaseHealth(): Promise<boolean> {
  return dbConnection.healthCheck();
}

export async function closeDatabaseConnection(): Promise<void> {
  return dbConnection.close();
}
