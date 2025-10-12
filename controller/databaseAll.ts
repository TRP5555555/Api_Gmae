// -- 1️⃣ ตารางผู้ใช้
// CREATE TABLE users (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     username VARCHAR(100) NOT NULL,
//     email VARCHAR(255) NOT NULL UNIQUE,
//     password_hash VARCHAR(255) NOT NULL,
//     profile_image VARCHAR(500) DEFAULT 'default.png',
//     role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
//     wallet DECIMAL(18,2) NOT NULL DEFAULT 0.00,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );

// -- 2️⃣ ตารางประเภทเกม
// CREATE TABLE game_categories (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     name VARCHAR(100) NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );

// -- 3️⃣ ตารางเกม
// CREATE TABLE games (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     name VARCHAR(255) NOT NULL,
//     description TEXT,
//     category_id INT NOT NULL,
//     release_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
//     image_path VARCHAR(500) DEFAULT 'default_game.png',
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//     FOREIGN KEY (category_id) REFERENCES game_categories(id)
// );

// -- 4️⃣ ตารางตะกร้าสินค้า
// CREATE TABLE cart_items (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     game_id INT NOT NULL,
//     quantity INT NOT NULL DEFAULT 1,
//     added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT unique_cart_item UNIQUE(user_id, game_id),
//     FOREIGN KEY (user_id) REFERENCES users(id),
//     FOREIGN KEY (game_id) REFERENCES games(id)
// );

// -- 5️⃣ ตารางการซื้อเกม
// CREATE TABLE purchases (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     total_amount DECIMAL(18,2) NOT NULL,
//     FOREIGN KEY (user_id) REFERENCES users(id)
// );

// -- 6️⃣ ตารางรายละเอียดเกมที่ซื้อ
// CREATE TABLE purchase_items (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     purchase_id INT NOT NULL,
//     game_id INT NOT NULL,
//     price DECIMAL(18,2) NOT NULL,
//     FOREIGN KEY (purchase_id) REFERENCES purchases(id),
//     FOREIGN KEY (game_id) REFERENCES games(id)
// );

// -- 7️⃣ ตารางธุรกรรม (เติมเงิน / ซื้อเกม)
// CREATE TABLE transactions (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     type ENUM('deposit','purchase') NOT NULL,
//     amount DECIMAL(18,2) NOT NULL,
//     game_id INT DEFAULT NULL,
//     transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     status ENUM('success','failed') NOT NULL DEFAULT 'success',
//     FOREIGN KEY (user_id) REFERENCES users(id),
//     FOREIGN KEY (game_id) REFERENCES games(id)
// );

// -- 8️⃣ ตารางโค้ดส่วนลด
// CREATE TABLE discount_codes (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     code VARCHAR(50) NOT NULL UNIQUE,
//     discount_amount DECIMAL(18,2) NOT NULL,
//     usage_limit INT NOT NULL DEFAULT 1,
//     used_count INT NOT NULL DEFAULT 0,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
// );

// -- 9️⃣ ตารางการใช้โค้ดส่วนลดของผู้ใช้
// CREATE TABLE user_discount_usage (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     discount_code_id INT NOT NULL,
//     used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY (user_id) REFERENCES users(id),
//     FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id),
//     CONSTRAINT unique_user_discount UNIQUE(user_id, discount_code_id)
// );

// -- 🔟 ตารางอันดับเกมขายดี
// CREATE TABLE game_ranking (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     game_id INT NOT NULL,
//     rank_date DATE NOT NULL,
//     rank_position INT NOT NULL,
//     sales_count INT NOT NULL DEFAULT 0,
//     FOREIGN KEY (game_id) REFERENCES games(id)
// );
