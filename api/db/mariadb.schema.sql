CREATE DATABASE IF NOT EXISTS api_dev_quick_cmd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE api_dev_quick_cmd;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commands (
  id VARCHAR(128) PRIMARY KEY,
  category_id VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  command_text TEXT NOT NULL,
  description_text TEXT NULL,
  docs_text TEXT NULL,
  tags_json JSON NULL,
  placeholders_json JSON NULL,
  examples_json JSON NULL,
  steps_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commands_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_commands_category ON commands(category_id);
CREATE FULLTEXT INDEX idx_commands_text ON commands(title, command_text, description_text);
