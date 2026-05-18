-- Run this in your PostgreSQL database to add PERCENTAGE to the UoMTypeEnum
-- Compatible with SQLAlchemy's Enum mapping

ALTER TYPE uomtypeenum ADD VALUE IF NOT EXISTS 'PERCENTAGE';