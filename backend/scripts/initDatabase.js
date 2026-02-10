const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise();

async function initializeDatabase() {
  try {
    console.log('Initializing CRMS Database...\n');

    // Check if default admin exists
    const [existingAdmins] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      ['sylvia@gmail.com']
    );

    if (existingAdmins.length > 0) {
      console.log('Default System Admin account already exists.');
      console.log('Resetting password to default...\n');
      
      // Reset password to default
      const defaultPassword = 'Sylvia@#12345';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      await db.execute(
        'UPDATE users SET password = ?, must_change_password = TRUE, status = ? WHERE email = ?',
        [hashedPassword, 'ACTIVE', 'sylvia@gmail.com']
      );
      
      console.log('✅ Password reset successfully!');
      console.log('\nDefault Login Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:    sylvia@gmail.com');
      console.log('Password: Sylvia@#12345');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n⚠️  IMPORTANT: User must change password on first login.\n');
      process.exit(0);
    }

    // Hash the default password
    const defaultPassword = 'Sylvia@#12345';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Create default System Admin
    const [result] = await db.execute(
      'INSERT INTO users (email, password, first_name, last_name, role, status, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['sylvia@gmail.com', hashedPassword, 'Sylvia', 'Admin', 'SYSTEM_ADMIN', 'ACTIVE', true]
    );

    console.log('✅ Default System Admin account created successfully!');
    console.log('\nDefault Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    sylvia@gmail.com');
    console.log('Password: Sylvia@#12345');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: User must change password on first login.\n');

    // Log the creation
    await db.execute(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [result.insertId, 'CREATE_USER', 'users', result.insertId]
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n⚠️  Database tables do not exist. Please create the database schema first.');
      console.error('   Make sure the "users" and "audit_logs" tables exist.\n');
    }
    
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();

