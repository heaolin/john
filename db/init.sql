-- 测试数据库：用户、商品、订单
DROP TABLE IF EXISTS order_items, orders, products, users CASCADE;

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  city        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  category  TEXT NOT NULL,
  price     NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock     INT NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL CHECK (status IN ('待付款','已付款','已发货','已完成','已取消')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id    INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

INSERT INTO users (name, email, city, created_at) VALUES
  ('张伟', 'zhangwei@example.com', '北京', '2026-01-05'),
  ('李娜', 'lina@example.com',     '上海', '2026-02-11'),
  ('王芳', 'wangfang@example.com', '广州', '2026-03-20'),
  ('刘洋', 'liuyang@example.com',  '深圳', '2026-04-02'),
  ('陈静', 'chenjing@example.com', '杭州', '2026-05-18'),
  ('杨磊', 'yanglei@example.com',  '成都', '2026-06-30');

INSERT INTO products (name, category, price, stock) VALUES
  ('机械键盘',     '数码', 399.00, 120),
  ('无线鼠标',     '数码', 129.00, 300),
  ('27寸显示器',   '数码', 1599.00, 45),
  ('保温杯',       '家居', 89.00,  500),
  ('人体工学椅',   '家居', 1299.00, 30),
  ('咖啡豆 500g',  '食品', 78.00,  200),
  ('绿茶 250g',    '食品', 65.00,  260),
  ('降噪耳机',     '数码', 899.00, 80);

INSERT INTO orders (user_id, status, created_at) VALUES
  (1, '已完成', '2026-06-01'), (1, '已发货', '2026-10-28'),
  (2, '已完成', '2026-07-15'), (3, '已付款', '2026-11-01'),
  (4, '已取消', '2026-08-09'), (4, '已完成', '2026-09-12'),
  (5, '待付款', '2026-11-08'), (6, '已完成', '2026-10-03');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 399.00), (1, 2, 1, 129.00),
  (2, 6, 3, 78.00),
  (3, 3, 2, 1599.00),
  (4, 5, 1, 1299.00), (4, 4, 2, 89.00),
  (5, 8, 1, 899.00),
  (6, 7, 4, 65.00), (6, 2, 1, 129.00),
  (7, 8, 1, 899.00), (7, 1, 1, 399.00),
  (8, 4, 1, 89.00);
