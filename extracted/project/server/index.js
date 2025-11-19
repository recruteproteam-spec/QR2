const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'u845174030_qrticketadmin',
  password: 'Amine@@@1991',
  database: 'u845174030_qrticketpro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { ticketId } = req.body;
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'INSERT INTO tickets (ticket_id, status) VALUES (?, ?)',
        [ticketId, 'unused']
      );
      
      res.status(201).json({ success: true, message: 'Ticket saved successfully' });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Database error', details: dbError.message });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error saving ticket:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});