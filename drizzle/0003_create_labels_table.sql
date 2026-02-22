-- Create dedicated labels table for D365 label translations
CREATE TABLE labels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  labelId VARCHAR(255) NOT NULL UNIQUE,
  labelText TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create index for faster label lookup
CREATE INDEX idx_labels_labelId ON labels(labelId);
