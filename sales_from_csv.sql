BEGIN;

-- Clear payments (not needed)
TRUNCATE TABLE payments CASCADE;

-- Clear existing sales
TRUNCATE TABLE sales CASCADE;

-- Insert sales from db.csv
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3e8a160c-d582-46a4-9410-e7cf83dd96dc', '峯 愁矢', '신규매출', 81818, '2024-06-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6ee5cf5b-17ae-4da6-8f14-a5fb7b1bd613', 'TRUE DESIGN CLINIC', '연장매출', 95454, '2024-06-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1d7a9883-7ff7-47f0-ad1a-a4187b6bee6a', 'epi', '연장매출', 29090, '2024-06-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ff60c795-d042-46c0-a078-8a2593229271', '株式会社わかば', '연장매출', 54545, '2024-06-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c03a3075-fc55-423a-b29b-54b51379d412', 'merci 石本 良太', '신규매출', 81818, '2024-06-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('523166ee-e16f-4447-86cc-665b2077a30e', '桃花', '신규매출', 1181, '2024-06-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6e718088-374d-4fbf-83a6-7ff5ace51139', '株式会社トラフィックラボ', '신규매출', 90909, '2024-06-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b446bac8-3908-439c-b3e2-29de1abcfe67', '清水 彰人', '신규매출', 109090, '2024-07-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7ec2a027-f633-47e5-aa92-c6d60b125b0c', 'TRUE DESIGN CLINIC', '연장매출', 95454, '2024-07-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9ef2f91d-a8f5-47ef-894c-4114052ff91b', 'TRUE DESIGN CLINIC', '연장매출', 95454, '2024-08-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c2a84b59-0902-438c-ab57-6eb7b0eadc04', 'epi', '연장매출', 29090, '2024-08-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a6b1dedb-5110-41c6-881a-ee788a512928', '清水 彰人', '연장매출', 109090, '2024-08-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ca3870bc-4ed8-484c-8f67-70450e928d68', '峯 愁矢', '연장매출', 90909, '2024-08-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d8cf80a0-9810-4b84-8430-12b26ef85436', '株式会社トラフィックラボ', '연장매출', 154545, '2024-08-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2eb028e3-5132-4062-a94f-c03a499dd949', 'merci 石本 良太', '연장매출', 81818, '2024-08-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('31d52332-8ddb-44a6-9656-4f70461b4c44', 'Unknown_17', '신규매출', 63636, '2024-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5260289c-498e-48ab-b21d-2301e7923c48', '株式会社トラフィックラボ', '연장매출', 90909, '2024-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('24d15e75-a77b-4e0b-a40d-456728970a5a', '株式会社トラフィックラボ', '연장매출', 136363, '2024-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c8153c32-ebd0-4b70-84d2-3e48bb25bc60', '伊藤由真', '신규매출', 12272, '2024-08-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9a478d37-471d-4752-9478-f436de45848f', '株式会社トラフィックラボ', '연장매출', 154545, '2024-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ff9687cf-2d69-46d9-bf99-9ccd39149e46', 'Unknown_22', '신규매출', 31818, '2024-08-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('283b273e-4145-411d-a073-8e57d2991280', 'Sun Tribe miyakojima', '연장매출', 9090, '2024-08-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e5112c41-a382-4826-9766-ddec240ac703', '株式会社CR Vision', '신규매출', 106363, '2024-08-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0f5da4f3-0734-4e98-8a09-a8d890e193c0', 'TRUE DESIGN CLINIC', '연장매출', 95454, '2024-09-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('95d32eb4-421e-4ff8-a404-92e55a7e0733', 'epi', '연장매출', 29090, '2024-09-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c3ecab7f-f5f6-4c6c-8187-e1a0224b5d0f', '峯 愁矢', '연장매출', 90909, '2024-09-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cca19612-bdef-4b2a-932a-13fa2fd7b4f2', 'Unknown_28', '연장매출', 63636, '2024-09-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b65ee07d-21af-4bd0-9854-59b2494a17bf', '株式会社トラフィックラボ', '연장매출', 154545, '2024-09-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('332db66c-3197-41c9-adf3-1421aca4030e', '清水 政隆', '연장매출', 113636, '2024-09-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4ea0f9df-d498-468a-a89c-6918152df175', '株式会社CR Vision', '연장매출', 106363, '2024-09-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f7b4c77e-1cc9-44b6-b200-b5ec927e8914', 'Unknown_32', '연장매출', 101818, '2024-09-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4f080a67-87fe-42a4-8f8d-c2e5a109301a', '株式会社IFREA DINING', '신규매출', 136363, '2024-09-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a08e9c69-dec7-4e39-ab2e-dcc5c93c10e4', '株式会社わかば', '연장매출', 72727, '2024-09-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9d97fcf7-39d5-4b74-8448-2f5661ad3d1e', '株式会社CR Vision', '신규매출', 27272, '2024-09-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c1620f5d-fa3e-4e63-b4b2-c8cd878d6648', '株式会社トラフィックラボ', '연장매출', 109090, '2024-09-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9c0e6e85-6723-420e-9379-61098215e093', 'TRUE DESIGN CLINIC', '연장매출', 13636, '2024-09-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8783bdf1-83bc-4d16-9f8e-705f40ca48ac', 'MB Medical Artmake', '신규매출', 57272, '2024-09-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b99ebbe6-81cb-460d-afdc-d185a4ad8049', '株式会社P.C.G', '신규매출', 2363, '2024-09-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8fd6d270-9f5d-459c-b0d0-47b69553726b', 'KIRENAL', '신규매출', 11818, '2024-09-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('975a6ffd-daa5-4637-bcfe-58f77eeb5c54', '國分大輔', '신규매출', 227272, '2024-09-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1be2d157-b997-4309-9e48-f45b5b8b3b1b', '松倉陸', '신규매출', 18181, '2024-09-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('81134989-9446-4fd8-9aa5-6a59ba62696b', '株式会社CR Vision', '신규매출', 27272, '2024-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4beee2d4-2c91-441c-a21c-03003462469d', 'TRUE DESIGN CLINIC', '연장매출', 136363, '2024-09-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e4aa6e87-5166-4854-864c-57a2dd208481', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2024-10-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ee48de02-d049-49a5-a649-9eec7c334b1f', 'epi', '연장매출', 32000, '2024-10-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('30135d65-be58-4c5d-8903-6949bc693c41', '峯 愁矢', '연장매출', 72727, '2024-10-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('da06eeb9-b4fa-4308-ae27-d7e3871a984e', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2024-10-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6973dab8-c51f-421f-8af7-f98a3760ff92', '清水 彰人', '연장매출', 120000, '2024-10-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('09424dea-a5bf-43d3-9e97-d113a905c3a1', '株式会社トラフィックラボ', '연장매출', 170000, '2024-10-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('17bbfd07-cd29-4c6c-9710-bdb5e09c1109', '株式会社トラフィックラボ', '연장매출', 120000, '2024-10-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1806d25c-5a91-4633-a033-cad763f3cc5c', '清水 政隆', '연장매출', 113636, '2024-10-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2d63e8e0-5573-43e1-af18-67ec59571d6a', '株式会社CR Vision', '연장매출', 106363, '2024-10-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('44300200-5968-4484-8af5-e3f7e80c02bc', 'Unknown_54', '연장매출', 101818, '2024-10-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3076458e-7fff-4f8f-80ca-b08ad605e536', '株式会社CR Vision', '연장매출', 45454, '2024-10-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('350ef996-23fb-414d-a62e-591d74b0962e', '株式会社わかば', '연장매출', 80000, '2024-10-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('11c0f8a6-a88f-41d1-ac65-e7fd11c587b1', '株式会社IFREA DINING', '연장매출', 150000, '2024-10-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8743caf4-b344-4ffb-8a88-d222b9bcc40d', '株式会社ALLURE', '신규매출', 118181, '2024-10-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5bdebe06-02af-4717-b075-482da7c16e76', '渡部幸司', '신규매출', 18181, '2024-10-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a6dde8d0-c39c-43ec-aead-e4b97819bffd', '株式会社トラフィックラボ', '연장매출', 120000, '2024-10-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f5643199-eddf-41c5-afa3-187b7d788d88', '山本さきこ', '신규매출', 40000, '2024-10-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a7ac3c1c-a4f2-4c9e-a45e-c2e2a1b1a767', '株式会社ALLURE', '신규매출', 30000, '2024-10-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('767dee6e-da00-4654-a6ab-60a5325996c9', '亀山友佳', '신규매출', 10000, '2024-10-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cc8033e5-153f-4c04-9c48-9426de6fad7e', '株式会社エモーション', '신규매출', 400000, '2024-10-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e3fdf644-2398-402c-a025-40a065b648bb', 'Unknown_65', '신규매출', 11700, '2024-10-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('75a7f10e-88d4-4136-9148-81ce9499db64', '株式会社OTTOGIマシジョア', '신규매출', 63636, '2024-10-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f3ec5e04-edd7-4243-a8e2-19c2f56ab163', '星野翔太', '신규매출', 54545, '2024-10-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1303d479-2c85-4c05-8817-cc11f30f9f36', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2024-11-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9119329f-e482-4ba4-91e9-ac61cc916e45', 'epi', '연장매출', 32000, '2024-11-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('40312296-be38-4ce4-b41e-890e43775cfc', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2024-11-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c3ca0f2e-32c3-4c6f-8d82-6e40170bb726', '峯 愁矢', '연장매출', 72727, '2024-11-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3d141bfc-42e4-49ca-af03-59e986618b0a', '清水 彰人', '연장매출', 120000, '2024-11-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bdd6660f-8794-43da-9056-f9680f8a2e46', '株式会社トラフィックラボ', '연장매출', 120000, '2024-11-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fd812940-099e-418d-9971-773f9201cd46', '株式会社CR Vision', '연장매출', 106363, '2024-11-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5c34c834-25f8-4c25-9fb9-f500bfa73179', 'Unknown_75', '연장매출', 101818, '2024-11-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('620fe72c-7f81-48a0-a88c-b2ad5ef94b01', '株式会社CR Vision', '연장매출', 50000, '2024-11-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('59be4102-8f09-4955-b5af-a05ccdaf7c51', '松倉陸', '신규매출', 20000, '2024-11-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e1baf5a1-4ed2-4af8-aebf-3ac66a650962', 'Unknown_78', '연장매출', 70000, '2024-11-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e39f64d0-b5c6-4858-a85c-ab558822ef7d', 'the artmake tokyo', '신규매출', 330000, '2024-11-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9273499f-97ec-4838-8158-7fd296824c39', '株式会社オールディッシュ', '연장매출', 100000, '2024-11-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a1ad2e7f-3dd7-4058-a5a3-dad7ecdc2c2d', '山本さきこ', '신규매출', 40000, '2024-11-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b07f81cc-5cc5-4a51-bb5f-306e46ccd7be', '株式会社IFREA DINING', '연장매출', 150000, '2024-11-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('38bc9822-9c0e-445d-8e74-b2dbb3ba866d', 'TRUE DESIGN CLINIC', '연장매출', 150000, '2024-12-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('aaffdaa6-c98a-436b-bdea-c0166d7d2380', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2024-12-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9fb55e5c-7fc1-44b1-aee5-7efcf1d2be2d', '株式会社ALLURE', '신규매출', 15000, '2024-10-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('49e58399-2b25-42fc-b005-2a567e78d28d', '株式会社efub', '신규매출', 60000, '2024-10-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fd282b52-cb79-4391-b989-72af6cd09603', 'TRUE DESIGN CLINIC', '연장매출', 150000, '2024-10-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7b9236f5-8007-427b-b300-88246ac5355e', '峯 愁矢', '연장매출', 81818, '2024-05-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fdd63d7a-4bcb-4bae-9c57-c497427fa573', 'TRUE DESIGN CLINIC', '신규매출', 95454, '2024-05-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3da02846-06be-4f32-a761-cf270aaf152d', 'epi', '신규매출', 36363, '2024-05-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('14ee6a77-ceb1-446d-8853-de12d7835399', '株式会社わかば', '신규매출', 54545, '2024-05-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4e93105c-3a7a-4d08-a5a9-4ec73073c0fe', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2024-12-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('04cfaee7-1cd9-4c8a-9312-ab7b0af5598a', 'epi', '연장매출', 40000, '2024-12-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('810929f8-b888-4af1-8b2a-6eae87285f5c', '峯 愁矢', '연장매출', 72727, '2024-12-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('561eaf8a-24da-4846-9847-3245b96eaaf7', '今井佑宥', '신규매출', 11000, '2024-12-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('80c7283b-cdb7-40ef-aee8-4d1775da25b5', 'Unknown_96', '신규매출', 20000, '2024-12-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7cc8b722-8f15-41d9-80f6-620193f7fe46', '株式会社IFREA DINING', '연장매출', 100000, '2025-01-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6c5bd916-236e-4386-aa7f-bc8efa2733f7', '株式会社IFREA DINING', '연장매출', 100000, '2025-01-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('493aa8d7-6718-4677-84f1-08c2577c62fd', '株式会社IFREA DINING', '연장매출', 35000, '2024-12-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('450991ee-beab-4413-afb3-033ebc31d597', '清水 彰人', '연장매출', 120000, '2024-12-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2d9763bd-c7a5-4c8f-8f4f-7e9a6957ddcd', '株式会社CR Vision', '연장매출', 106363, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('05606ccd-397c-4921-b7c4-16699b5fded3', '株式会社CR Vision', '연장매출', 101818, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('33a9f644-99d9-4065-9dd7-49b858e58573', '株式会社CR Vision', '연장매출', 50000, '2025-01-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8c48610b-457e-424f-8a2e-17dae794122f', '株式会社CR Vision', '연장매출', 30000, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cebfaf8a-0f8a-4830-afd5-4eeb8f565764', '亀山友佳', '신규매출', 10000, '2024-12-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fba2854b-07ab-4f31-85bb-cc09fd1bcb56', 'browtique', '연장매출', 50000, '2024-12-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('eec1064a-3c69-4e1a-94ef-8a76b2cea1df', '株式会社IFREA DINING', '연장매출', 150000, '2025-03-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5a50fd07-4369-43b7-8fe9-a93d6ba5786f', '株式会社エモーション', '연장매출', 400000, '2024-12-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('19a5e802-a7e4-44f5-9824-8a46b9b06edd', 'the artmake tokyo', '연장매출', 330000, '2024-12-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7bef2c16-e2b5-4fed-bbe8-a0eb591f4e74', '株式会社トラフィックラボ', '연장매출', 120000, '2024-12-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a5bfebbf-049a-42ee-99bb-ee55abb5d7c7', '株式会社ALLURE', '연장매출', 10000, '2024-12-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('119b0cd3-7343-46e0-87d1-f12a58ba0600', 'the artmake tokyo', '연장매출', 150000, '2024-12-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cfa405fe-4fd8-41b8-8cb3-2e343ba6c5db', 'イーストナイン', '신규매출', 150000, '2024-12-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8ecf0882-fe6e-46d1-99ab-8ed017fcbca5', 'Unknown_114', '연장매출', 60000, '2024-12-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bdf1cf99-c2c2-4259-b7a6-dcb2bfe6c838', '山本さきこ', '신규매출', 2500, '2024-12-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5d299a26-d7cc-46a5-9a1c-459dac19495a', '山本さきこ', '신규매출', 2500, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('88180b13-ede4-43e9-9da8-294458cb93d1', '村上翼', '신규매출', 70000, '2024-12-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e22d80d0-8b60-4944-808b-6dc127d90380', 'YUMI', '신규매출', 10500, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9b85a4df-2fa9-4573-acf7-6bc19e7ddd1f', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2025-01-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('354aa441-bb58-4e18-998b-2f5dc4ce2ccd', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2025-01-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('df6ce03b-b030-4be1-bf15-a10a943021a5', 'epi', '연장매출', 40000, '2025-01-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d4896ed8-0651-4a7e-99a6-82180600c839', '峯 愁矢', '연장매출', 72727, '2025-01-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1568a291-24e6-4303-9390-00f5c28f50e9', 'browtique', '연장매출', 50000, '2025-01-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d68c89c4-834d-4537-b97f-9732d1677e2a', 'browtique', '연장매출', 80000, '2025-01-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6284bc37-72b9-4b5f-990a-413a2f9464a9', '株式会社CR Vision', '연장매출', 106364, '2025-01-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f4b31fc6-0d61-49ab-8417-16d99348e39e', '株式会社CR Vision', '연장매출', 101818, '2025-01-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ab1461da-3276-4b92-a27b-1d5ef24eea51', '株式会社CR Vision', '연장매출', 50000, '2024-12-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fedfdbe5-94e6-458b-a3ab-a02496a7db2c', '株式会社トラフィックラボ', '연장매출', 120000, '2025-01-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('be8b1118-2ee5-4ae8-88fc-ae837bff1ad9', 'ネイティブキャンプ', '신규매출', 448485, '2025-01-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bda144ec-9eb3-4200-bd1a-b2086effc97c', '伊藤由真', '신규매출', 90000, '2025-01-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d597fd50-f4e6-4e7d-9b95-61bfecf33e71', 'UcanB美容外科・皮膚科', '신규매출', 100000, '2025-01-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('41bfc04d-8c23-4349-a0a7-58b89b30fb7b', '山本さきこ', '연장매출', 5000, '2025-01-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bd96f9de-913b-4bc9-bcfe-90c4c98d9680', '株式会社IFREA DINING', '연장매출', 150000, '2024-12-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b2fc0265-4b07-4550-8c9a-062e591a351d', '株式会社エモーション', '연장매출', 485000, '2025-03-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9e9dd93f-deb9-4489-a8b2-5a3c66852958', 'イーストナイン', '연장매출', 150000, '2025-01-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('32587740-0713-4090-a372-73d9786f2570', 'the artmake tokyo', '연장매출', 150000, '2025-01-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('791b5632-acff-467b-8a4a-4f1bf336ef2e', 'the artmake tokyo', '연장매출', 330000, '2025-01-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('40ef4df9-a016-41bc-a5a3-db1fb0b893a8', 'Unknown_138', '연장매출', 60000, '2025-01-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1957e5e8-c572-4a5e-bec0-dd80a341cd05', '株式会社IFREA DINING', '연장매출', 100000, '2024-12-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e844a3db-012e-4364-b88c-047a185cc4c8', '株式会社IFREA DINING', '연장매출', 100000, '2024-12-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('188db7ac-c9be-40b9-bdb1-2066d4deaf51', '株式会社IFREA DINING', '연장매출', 20000, '2025-01-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5a666675-2ad7-43f7-a210-179ca22c2d51', '山本さきこ', '연장매출', 2500, '2025-01-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f809abd0-c518-4a0b-9c1b-6dfa40dadf0e', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2025-02-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e610b3f1-c41d-4f19-96ab-8368f35ebace', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2025-02-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fd499c55-26fd-4bfc-9a6b-583fdf781775', 'epi', '연장매출', 40000, '2025-02-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a403f279-dde4-4cac-b71f-c83991a57f72', 'YUMI', '연장매출', 3000, '2025-02-03'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a49ef003-27dd-46ae-8e11-731999ebe8a9', '株式会社ALLURE', '연장매출', 67000, '2025-02-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('04615923-5711-4995-aad8-9555ba05e548', '峯 愁矢', '연장매출', 72727, '2025-02-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('539c662f-dbf0-4fa1-819a-c0230bcae7d2', '村上翼', '연장매출', 75000, '2025-02-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('581af4dc-e730-4d1c-b238-4be1ca32edd7', 'browtique', '연장매출', 130000, '2025-02-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c82da1e9-979e-4172-90d1-2710b018559c', '株式会社トラフィックラボ', '연장매출', 240000, '2025-02-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a56db668-d718-4d5c-a888-b28eb4be4d11', '株式会社エモーション', '신규매출', 35000, '2025-02-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('59a41ed4-2322-4877-a856-e9030ff3620b', '山本さきこ', '신규매출', 5000, '2025-02-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4cef6163-2322-4538-8e76-6a693e927cbc', 'Unknown_154', '신규매출', 70000, '2025-02-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b6312375-47e2-417a-93e3-b3c82c4f1826', '株式会社わかば', '연장매출', 80000, '2025-01-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e97e78e4-cbbf-495e-b6f2-c7296b20a273', 'ネイティブキャンプ', '연장매출', 448485, '2025-02-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a19396ff-c09b-41e8-a8c1-f5c6ce3161f7', '株式会社エモーション', '연장매출', 485000, '2025-04-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9fabbcd6-4ada-47ec-8fcc-1483a4c74137', '株式会社CR Vision', '연장매출', 300000, '2025-03-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5a1d8520-5abe-4898-907e-53c6b34485eb', 'the artmake tokyo', '신규매출', 70000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f8f6076c-d10c-4184-8b7f-ef2fd532aacf', '株式会社IFREA DINING', '연장매출', 370000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('74e29b4e-b953-4de3-9c05-5e678e2d0d07', 'イーストナイン', '연장매출', 150000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a3fed642-17d1-4aba-99f4-b2027d8770bb', 'the artmake tokyo', '연장매출', 480000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1b54b4f1-ea79-4869-a35b-dc2362223c44', 'Unknown_163', '연장매출', 60000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fce110bc-8178-4585-a16b-4e68614e1ed1', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2025-03-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b98de446-e24b-4e7d-87ef-c6674b23b1d2', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2025-03-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('92c3c3fa-d217-4e48-b82e-b8ada7051795', 'epi', '연장매출', 40000, '2025-03-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a955f750-b06c-4817-bfe6-10681cbe163a', '馬場春樹', '신규매출', 150000, '2025-03-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e012ee4d-eb97-4e4a-b5f1-363e39a1c105', '山本さきこ', '신규매출', 9300, '2025-03-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cacf99b1-5cb0-4162-8179-cee377cb71eb', 'Unknown_169', '신규매출', 30000, '2025-03-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6a4df18a-e3df-4db8-8587-dd11e447333b', '株式会社アチーブ', '신규매출', 40000, '2025-03-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('98d14fa0-0658-4a30-8a03-b7575f08ded1', '峯 愁矢', '연장매출', 72727, '2025-03-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('dfa25435-e5a2-49dd-9f07-d8bcf46fbe16', '株式会社トラフィックラボ', '연장매출', 240000, '2025-04-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('93774f7f-ac99-4038-a892-7c4a10d808d8', '村上翼', '연장매출', 75000, '2025-03-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('20b6f6e0-4d13-4124-a258-3a76176edd7a', 'Unknown_174', '신규매출', 140000, '2025-03-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e56e252c-e07d-49cf-a88a-5d7fe19a3893', '株式会社エモーション', '연장매출', 35000, '2025-03-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ec7a80ac-2c7c-47ac-8103-4ad234bbe417', 'ユミ', '신규매출', 1000, '2025-03-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ac7bec9f-bb51-464c-ba26-81dada39e610', 'ユミ', '신규매출', 200, '2025-03-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a2d3f3bb-1118-473b-9191-c64ad9a20164', '株式会社わかば', '연장매출', 80000, '2025-02-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a690e857-a0e5-42cf-a118-0b3580d14e7e', '吉田淳一', '신규매출', 9000, '2025-03-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e9e603d9-7cad-47bd-9f79-845ead41bf19', '増田栄里', '신규매출', 5000, '2025-03-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fb8c63b0-08e0-456d-8aa3-836a66625f2b', '山本さきこ', '연장매출', 1000, '2025-03-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('78f43500-e391-4b72-9c79-9afd9dbc9e08', 'the artmake tokyo', '연장매출', 400000, '2025-03-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('59aa4a4b-5926-4beb-bb92-b3a819951891', 'ネイティブキャンプ', '연장매출', 448485, '2025-03-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('882e068d-eb85-4a20-a7e9-c1a3e971d247', 'イーストナイン', '연장매출', 150000, '2025-03-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0820d2c8-fdec-4fb5-abc9-bc9044611163', 'Unknown_185', '연장매출', 60000, '2025-03-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('df0cb21e-5d27-4fb9-93aa-14576d757973', '株式会社わかば', '신규매출', 35000, '2025-03-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2c67223d-5adb-4aa2-a3a6-33f0764cfb8f', '馬場春樹', '신규매출', 100800, '2025-04-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('df4cfa00-7f97-41cd-b437-50138b20f7ce', '山本さきこ', '연장매출', 5000, '2025-04-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0a22d82b-0a65-4f6e-ae5a-56ce4399331a', '高橋涼介', '신규매출', 80000, '2025-04-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d2387cc6-560c-4776-83f8-5000ee89a213', 'YUMI', '신규매출', 7500, '2025-04-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e447964a-1264-4b23-b38a-866923e3f4ef', 'YUMI', '신규매출', 500, '2025-04-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bcd2922b-dc4f-4392-9a8a-66f1f0f664cd', '株式会社エモーション', '신규매출', 35000, '2025-04-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3d46bc45-d9ca-46ce-81c3-5986adf000c7', '峯 愁矢', '연장매출', 72727, '2025-04-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9dc38aa6-a917-4d5e-a12d-54e6ef761b06', '株式会社ALLURE', '신규매출', 15000, '2025-04-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('38464d10-8fc7-4c23-a6d8-5b98beb0b5a2', '上濱理奈', '신규매출', 4000, '2025-04-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fe4b84b2-80a3-48b1-92a8-d19b7df2ff9e', 'キクタミキ', '신규매출', 4545, '2025-04-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8bf6515c-7eac-4c51-ad1d-04db5c95c450', '株式会社エモーション', '연장매출', 35000, '2025-04-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('66c90089-2b11-4286-a628-7da42ca617e1', '株式会社アチーブ', '신규매출', 40000, '2025-04-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6730541a-af1e-46ee-b1f6-79506ca01691', '株式会社トラフィックラボ', '연장매출', 240000, '2025-03-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b187cd4d-5923-435d-ba5e-93db4584633f', 'ネイティブキャンプ', '연장매출', 318181, '2025-04-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a11be12c-bee9-4163-9a41-6a0549c00220', '株式会社わかば', '연장매출', 80000, '2025-03-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('573c31e9-0799-4282-89ec-34be53a4f422', '村上翼', '연장매출', 20000, '2025-04-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6f055dc9-c805-4d3f-97d8-459a35fd87b6', 'TRUE DESIGN CLINIC', '연장매출', 105000, '2025-04-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3469f9ca-88e2-4392-8cae-fa13b7870b9d', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2025-04-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fd1eb5b9-cdd8-422b-8f8a-3ede238fd8ad', 'doppler.new', '연장매출', 30000, '2025-05-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e8e193d3-ccbd-404e-9211-fbb8019e4846', '吉田淳一', '신규매출', 9000, '2025-04-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4e6b1e76-e70a-451f-b467-a0c4cddb9cf3', '株式会社エモーション', '연장매출', 485000, '2025-02-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('edb0788e-2091-4f7c-824a-e30e3cc0dd5b', 'Unknown_208', '신규매출', 80000, '2025-04-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('79e6ae77-66f2-4357-80f0-5b231f2677ad', 'the artmake tokyo', '연장매출', 400000, '2025-04-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c6cc1464-0523-4347-967d-bc2071d48df8', 'Unknown_210', '연장매출', 20000, '2025-04-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6df4ee4c-ee49-41a9-a786-2e447c4c1d11', 'イーストナイン', '연장매출', 150000, '2025-04-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5b06c74e-1659-4e23-aa0f-ffafe1974cbf', 'YUMI', '신규매출', 2000, '2025-04-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('530777fc-d7b4-4ab4-926e-377c0226ac6d', 'epi', '연장매출', 40000, '2025-05-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('40154aa4-7874-4b56-a4fc-41d70ac45ead', 'the artmake tokyo', '연장매출', 400000, '2025-05-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bb2f213b-7e30-4821-8b99-d721401ed3a9', 'ネイティブキャンプ', '연장매출', 318181, '2025-05-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3d945d69-dce2-4061-8fe6-510e12995b7e', '山本さきこ', '신규매출', 3500, '2025-05-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7ffd162d-adc1-48b9-af8b-d5d1255dc801', '野中美里', '연장매출', 45000, '2025-05-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('450b0fce-6fad-44b4-85f1-77218f42fdcb', '渋澤樹里', '신규매출', 10000, '2025-05-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1dd80e1e-1037-4c37-a608-4d1f95e72fb0', 'Unknown_219', '연장매출', 300000, '2025-05-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f26938f0-6787-4dc5-8747-9540046eb4f4', 'HIKARI屋', '신규매출', 50000, '2025-05-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('35003544-5744-4d81-a2c5-7991116dc6a2', 'Unknown_221', '연장매출', 80000, '2025-05-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7e9c7ffc-32d0-4554-a6b1-b9561ad871d5', '株式会社エモーション', '연장매출', 35000, '2025-05-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e5bf65bf-003c-4e4d-8f02-42d3137f9579', '峯 愁矢', '연장매출', 72727, '2025-05-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d4af8420-ac22-47c8-bedd-ed9332632bc1', 'Unknown_224', '신규매출', 290, '2025-05-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c4c71e29-2468-440b-bdfe-6847219e72bd', 'Unknown_225', '연장매출', 99200, '2025-05-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('06c00ab7-f6e1-4e84-8309-588017815041', 'Unknown_226', '신규매출', 30000, '2025-05-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c4a419fb-76db-4fc3-a856-679971520322', '高橋涼介', '연장매출', 80000, '2025-05-13'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d8abe557-e7e9-49d9-a36e-7b0ea6213e86', '村上翼', '연장매출', 20000, '2025-05-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5ff5de9e-8d32-4d5b-a51a-5b6627134d29', '株式会社オールディッシュ', '연장매출', 150000, '2025-06-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('584ee66c-9691-4ff7-853a-ec705ab3435a', 'スマート健康クリニック', '신규매출', 30000, '2025-06-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a1bdf3c1-6289-40cc-8ec2-473e1e0072a3', '清水 彰人', '신규매출', 136363, '2024-07-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7cd27ff6-842c-4634-b88a-d93bb63eb4ce', '株式会社トラフィックラボ', '연장매출', 90909, '2024-07-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('53257c89-6d84-4b45-80bb-4f11c85f39e3', '株式会社わかば', '연장매출', 80000, '2024-12-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b20d8810-dbe0-414f-9943-796eec2b9358', '湊谷千春', '신규매출', 12727, '2024-07-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a0bec563-24d3-4b13-81e5-aad5ca6aba78', '株式会社トラフィックラボ', '연장매출', 154545, '2024-07-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('405cec49-3ac6-4711-abd4-27b0e63ec564', '藤枝麻美', '연장매출', 109090, '2024-08-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d94bd878-f905-4aaa-bc46-b1cf484a5bae', '株式会社わかば', '연장매출', 72727, '2024-08-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6722840e-bf64-4dbb-b3a8-0d5129b5a64c', 'Sun Tribe miyakojima', '연장매출', 31818, '2024-08-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8262299b-1303-4366-85f3-1c1852aadde4', '清水 政隆', '연장매출', 181818, '2024-08-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('75615826-f8f2-4e5c-a3b7-f903d73142ed', '清水 彰人', '연장매출', 109090, '2024-09-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('41966cfe-e38c-4c7d-a28c-0b084a4c3ea6', '株式会社トラフィックラボ', '연장매출', 154545, '2024-09-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1d4e5c22-6fb5-467f-b0a8-28572f51abf7', '株式会社トラフィックラボ', '연장매출', 120000, '2024-11-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2c2a7b22-c307-4f5a-8bf0-f8cabd1be7ef', '株式会社わかば', '연장매출', 80000, '2024-11-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('326efe84-ba64-4b05-94ad-bb772873a967', '株式会社トラフィックラボ', '연장매출', 120000, '2024-11-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('82799e70-2c5d-4516-b197-23f32698c5d7', 'TRUE DESIGN CLINIC', '연장매출', 150000, '2024-11-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8abeccfb-a8a9-4e25-ad2c-6f1887b1ebd9', 'Unknown_246', '연장매출', 60000, '2024-11-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('51906495-7151-4b00-80d7-37c9ed5007b9', '株式会社エモーション', '연장매출', 400000, '2024-11-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5e6f2629-0431-4328-b8bb-c79eed3fe792', 'browtique', '신규매출', 80000, '2024-11-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7a3b81fe-801c-4b14-80a1-249b732ae317', '株式会社オールディッシュ', '연장매출', 100000, '2024-11-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9dea541e-bbcc-4929-8073-d3adedd4b36e', '亀山友佳', '신규매출', 10000, '2024-11-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7edddc6f-169f-4c92-bd0f-14d65fd91786', '株式会社CR Vision', '연장매출', 300000, '2025-02-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b9b37355-01e7-417d-a51a-c7cdcfce35e8', '峯 愁矢', '연장매출', 81818, '2024-07-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('660324ed-9170-449e-bdb3-d13ea8e44061', '藤枝麻美', '신규매출', 90909, '2024-07-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9373f404-ff45-41b9-876e-420ee985266b', 'merci 石本 良太', '연장매출', 81818, '2024-07-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ae856fa8-4921-4f96-b664-cb729657b11d', '株式会社トラフィックラボ', '연장매출', 54545, '2024-07-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c4d3baa0-215e-4f10-84e5-7c76fe83c835', 'epi', '연장매출', 29090, '2024-07-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('45c3ca38-c2b5-4db9-b4e9-d439e24c3a7c', 'Unknown_257', '신규매출', 63636, '2024-07-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('28d61b1e-b171-4d3b-9919-3927f3016a53', '株式会社わかば', '연장매출', 72727, '2024-07-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cb07b7fe-dff8-4355-99c9-6c24b3af6abe', '清水さん', '신규매출', 100000, '2024-12-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('73129b5c-3891-4d35-9e80-5cab2735818a', '株式会社オールディッシュ', '연장매출', 100000, '2024-12-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('764bba65-593d-4525-a66e-71e78499750f', '株式会社トラフィックラボ', '연장매출', 120000, '2024-12-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('eb8d2a9d-285d-4fc7-bae2-ee70251f3506', '株式会社オールディッシュ', '연장매출', 150000, '2024-12-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9fce823b-a426-4264-97bd-dd37e8328b3d', '株式会社オールディッシュ', '연장매출', 100000, '2024-12-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('170a3e6e-c1c5-4bdb-97b4-d60f5b43ce7b', '株式会社トラフィックラボ', '연장매출', 120000, '2024-12-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0d9efc4e-602d-4579-80f0-0651c06e9c5b', '株式会社IFREA DINING', '연장매출', 150000, '2025-01-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6d57db15-e59c-488d-9fae-483669c61afc', 'TRUE DESIGN CLINIC', '연장매출', 150000, '2025-01-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('eeffbaf1-22e5-4d38-8ed6-f9cedd85338a', '株式会社わかば', '연장매출', 80000, '2025-01-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6a214baf-e9f2-460f-b99d-ef6532137aca', '清水 彰人', '연장매출', 120000, '2025-01-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c7453e99-40db-4240-af4c-a3e5d23a01c6', '株式会社エモーション', '연장매출', 400000, '2025-01-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a4e92d92-2e51-4b32-9b81-a52a85b86346', '株式会社オールディッシュ', '연장매출', 100000, '2025-01-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5f2362da-a187-44e1-b5cc-cfcb4a0c28a9', '株式会社オールディッシュ', '연장매출', 100000, '2025-01-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6fb91cd6-d83f-498b-9f5c-2913b80f9996', '株式会社オールディッシュ', '연장매출', 150000, '2025-01-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('320898ee-c8f0-48b8-8b48-c0c5993e69ca', '株式会社オールディッシュ', '연장매출', 150000, '2025-02-19'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7ddff8bd-8af6-471f-863c-88468684b065', '株式会社オールディッシュ', '연장매출', 200000, '2025-02-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('dd77c4c9-920a-4314-878e-829c0f1fa71c', '株式会社オールディッシュ', '연장매출', 150000, '2025-03-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('21a15882-f72b-4763-aa0c-42cace9b5997', 'ユミ', '신규매출', 1000, '2025-03-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('95708d61-24bd-4dd7-b649-18573664a490', 'YUMI', '신규매출', 1000, '2025-03-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9699f70d-6634-4cec-adc8-607100d4239e', '株式会社オールディッシュ', '연장매출', 100000, '2025-03-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7454b042-e3e8-4de8-a929-3b219db0a6b1', '株式会社オールディッシュ', '연장매출', 150000, '2025-04-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('59d8b826-5686-4adf-ba1c-db0771ea7c53', '株式会社わかば', '연장매출', 80000, '2025-04-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('24461a02-83a0-4ce6-9d66-ea7dfb9685fe', '株式会社オールディッシュ', '연장매출', 100000, '2025-04-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7aace5be-1edf-4cdc-a7b4-228a46bf54ba', 'epi', '연장매출', 40000, '2025-04-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('211c2621-8cef-4819-9cd8-24f8c4e03f5a', '株式会社オールディッシュ', '연장매출', 340000, '2025-04-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('566dd11c-eaf1-4200-a871-f758a37cffcb', 'Unknown_284', '연장매출', 20000, '2025-05-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('43bee81b-0e3c-4875-a340-97ced04874af', '株式会社オールディッシュ', '연장매출', 150000, '2025-05-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f50e4a08-6f96-4aeb-ab7a-7515c062d3dd', '株式会社わかば', '연장매출', 80000, '2025-05-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('87d2565c-aab7-4d90-a7c5-6ac527e2414f', 'doppler.new', '신규매출', 30000, '2025-05-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d8fb27db-ae00-4897-b7c3-8d4ab36ef042', 'イーストナイン', '연장매출', 150000, '2025-05-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3a65ae18-c229-4b68-bf58-40417643f032', '株式会社オールディッシュ', '연장매출', 290000, '2025-05-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5665032a-f1a4-434b-8a3b-cb57692f8722', 'Unknown_290', '연장매출', 300000, '2025-05-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a548b466-7629-47c7-a909-43a37c62b318', 'キクタミキ', '신규매출', 5000, '2025-05-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ed3bb126-d1fe-4fd5-9688-6c05375f2b22', 'YUMI', '신규매출', 7500, '2025-05-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('44321c75-c7e8-4260-bfb8-2cf76a677839', '田中 優奈 フラワーアーティスト', '신규매출', 4545, '2025-05-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e639ca97-ccdc-42a2-a1bd-ec84a029b096', '株式会社アチーブ', '연장매출', 40000, '2025-05-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b5d5563a-71bb-4962-9cdb-6a56876d30f4', 'TRUE DESIGN CLINIC', '연장매출', 15000, '2025-05-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d6726459-faf9-481c-ab1e-41927d433b1e', '株式会社トラフィックラボ', '연장매출', 240000, '2025-05-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('08dcfe18-62dc-4413-8208-18e50b7daa54', '株式会社エモーション', '연장매출', 35000, '2025-05-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b87bd495-2c6e-4487-983d-5fbcb2bfb49e', '株式会社わかば', '신규매출', 40000, '2025-05-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ba22dab9-875b-4493-9600-60a0e5dc5280', '峯 愁矢', '연장매출', 72727, '2025-06-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2c0d77bb-d764-4d17-b07f-a4d53edc1ef7', 'Unknown_300', '신규매출', 10000, '2025-06-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9987f7d8-74bc-4bc6-b0e9-0b2442c7dffb', '楠彩花', '신규매출', 80000, '2025-06-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('58fc5206-9dad-40ae-923c-411959d8a038', '馬場春樹', '연장매출', 100000, '2025-06-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9e380f20-8405-449e-aa83-670a61627c4c', 'Unknown_303', '신규매출', 50000, '2025-06-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('07fefdd2-9f4a-4b2b-91a8-c468de51c96f', '八鍼灸院', '신규매출', 10000, '2025-07-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('40324a46-e9c7-4f82-b9e2-c2ec755a814b', 'the artmake tokyo', '연장매출', 400000, '2025-06-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('32e1b49b-b83b-49ca-941f-a978dfbe355d', 'イーストナイン', '연장매출', 136363, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('65165d09-b988-4a5c-8298-8306eac96518', '峯 愁矢', '연장매출', 72727, '2025-06-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b30d5901-b655-4499-856e-19db564bfd12', '株式会社アチーブ', '연장매출', 40000, '2025-06-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6aa5f6d4-60ac-4be9-8c7c-78388207864a', '株式会社トラフィックラボ', '연장매출', 240000, '2025-06-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('25440632-3bbc-468d-844a-3996817a8760', 'browtique', '연장매출', 80000, '2025-06-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a18b76a3-0ffb-4a71-b398-5d0a9a0df1fa', '株式会社オールディッシュ', '연장매출', 120000, '2025-06-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('71397992-4716-4cbd-80e9-8e47703f33a7', '楠彩花', '연장매출', 80000, '2025-07-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e31db411-bbdb-4329-be98-562ad16d1fb7', '株式会社CR Vision', '연장매출', 300000, '2025-06-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fdeb5a5f-c135-471d-a487-ff89f5c32b17', '株式会社わかば', '신규매출', 40000, '2025-06-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('38ef51c2-e9bd-4268-b2d0-c1f4ccaa03d3', '株式会社エモーション', '신규매출', 250000, '2025-06-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('10c2a732-9632-42cd-918e-b98cd2dbae8b', '山崎美雪', '신규매출', 60000, '2025-06-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('fe1458ad-388f-48af-9617-0b9757c41a25', 'カタヤマ タツミ', '신규매출', 70000, '2025-06-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('114b424e-b5dc-40cb-b3e6-2a4bbab12969', '株式会社わかば', '연장매출', 80000, '2025-06-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e3360fcc-168a-4e56-ab73-70fe4e977cd1', '元橋 啓太', '신규매출', 70000, '2025-06-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4f227ddb-b2eb-42f0-8985-b5e8527dfdd5', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d06628e3-decf-4528-9672-ee3c2c2aa192', '高橋涼介', '연장매출', 80000, '2025-06-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9c728b43-9386-4a6a-a583-db1d68bd1f73', 'doppler.new', '연장매출', 30000, '2025-06-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('503ce153-7e0d-45b5-807e-81e312eb3b2b', 'ネイティブキャンプ', '연장매출', 318181, '2025-06-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4e37633e-442a-43cc-826f-4a948f9ea348', 'Unknown_324', '연장매출', 80000, '2025-06-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8cae4fa1-e952-4422-9db1-2e48adfa4f46', '村上翼', '연장매출', 20000, '2025-06-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9aee633a-1ea7-4e35-bee2-fcbc0430f64b', '星野翔太', '신규매출', 30000, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2dc54607-bc9f-4dd5-8772-ccb91c20a8c6', 'Unknown_327', '연장매출', 65000, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2b1873ee-7d28-4bed-93bb-7871de6a638b', '株式会社efub', '연장매출', 20000, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7519b5fd-3bc8-4446-afc4-190f92f53a35', '株式会社エモーション', '연장매출', 35000, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('87bbb893-d73e-478b-8bc6-ed456384a93c', '株式会社エモーション', '연장매출', 250000, '2025-07-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7a6b4227-06b5-4f5f-8c66-d6aea6c90f38', '山崎美雪', '연장매출', 60000, '2025-07-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6b373ba1-58ee-46cb-a0b1-a3301d10246e', '株式会社オールディッシュ', '연장매출', 270000, '2025-06-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('38bb1e20-60b9-4b1b-b04c-6fe0f94bf81b', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1e39da3c-9b34-4873-bde4-86f543b64b8b', 'スマート健康クリニック', '신규매출', 35000, '2025-07-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7b088996-0174-4a05-b9e7-9b94ba07cb9a', '野中美里', '연장매출', 45000, '2025-07-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('75958eb4-be64-4d9d-96f8-48f3f690db23', '太田優斗', '신규매출', 45000, '2025-07-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4a1f2303-7719-4b00-ae74-68a63a8b6164', '峯 愁矢', '연장매출', 72727, '2025-07-09'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a68b3705-9748-4787-8ec4-a703742ef05c', 'カタヤマ タツミ', '연장매출', 70000, '2025-07-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4b978479-a62b-43d9-b7cb-4047807220ac', '小松崎祐太', '신규매출', 54545, '2025-07-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9fd72f53-63ea-451e-87ed-bcf4a360f9e3', 'Cafe Madu ENOSHIMA', '연장매출', 65000, '2025-08-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3e94e0e8-c173-4ea0-862b-53506f4acc23', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e8571428-9f1e-41c3-90fa-fd2333289e66', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9b65fc09-dfa6-4f20-95be-c20bc9615a16', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5e3e64ac-a597-43bf-a99c-663837a121c7', 'epi', '연장매출', 40000, '2025-06-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7632667d-7563-482a-a7d3-eb61437cd916', '高橋涼介', '연장매출', 80000, '2025-07-06'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('b0b17472-5ff7-4989-b399-5e6b136e58dd', '馬場春樹', '연장매출', 50000, '2025-07-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('32a94c98-50a5-474a-aeba-ea7781111977', '株式会社アチーブ', '연장매출', 40000, '2025-07-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('eaf9281e-2f03-4a38-98bc-5e0575adaef1', 'browtique', '연장매출', 80000, '2025-07-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('87b2aa9c-aac7-40a0-aa36-958aba6f1ea6', 'ユミ', '신규매출', 1000, '2025-07-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cd180747-27cc-4cfb-a606-a9bde754e0e2', 'ユミ', '신규매출', 500, '2025-07-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('191024a2-bd89-42ec-939f-332825b27ce2', 'ユミ', '신규매출', 7500, '2025-07-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e9c503eb-6a11-47b2-91cc-7f1fba3e503e', '株式会社トラフィックラボ', '연장매출', 240000, '2025-07-16'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e2267171-2f20-4c25-a629-c43ec39c1d63', '株式会社CR Vision', '연장매출', 300000, '2025-07-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3b117d94-3c78-4c68-87e1-5592aa0a4da4', '株式会社わかば', '신규매출', 112000, '2025-07-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('d9475b77-4ed3-4474-b5dd-4d9aff30a66c', 'merci 石本 良太', '신규매출', 50000, '2025-08-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('440fad03-a146-4f79-b64f-5ea9143cc4d0', 'Sun Tribe miyakojima', '신규매출', 30000, '2025-07-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ae146f68-1f9f-4d08-b3eb-af414eeb54a3', '株式会社オールディッシュ', '연장매출', 270000, '2025-07-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('84e0cab8-683c-4930-a746-05a8e07794f3', '株式会社わかば', '연장매출', 27272, '2025-07-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a24b8189-9285-47c8-be81-cf30d21c2697', 'ネイティブキャンプ', '연장매출', 159090, '2025-07-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1fd2658c-27bf-4614-93c4-9bd088d8b672', 'the artmake tokyo', '연장매출', 400000, '2025-07-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('36dda2b9-0078-4f0b-99fa-45dcae636e94', '村上翼', '연장매출', 30454, '2025-07-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9acc4265-c677-4613-80c7-620474b8f22f', 'Cafe Madu ENOSHIMA', '연장매출', 65000, '2025-07-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f48edff4-0f1f-4cd4-874f-30ab2f31c5ec', '株式会社efub', '연장매출', 20000, '2025-07-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8406b623-53d6-4d82-9ae6-ae616b78899b', 'la studio', '신규매출', 50000, '2025-07-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('181f6cde-04be-4b23-a52d-d566d140a5bf', 'HIKARI屋', '연장매출', 30000, '2025-08-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('8f564cd9-cfae-44a2-9c11-d38acd437b25', '山崎美雪', '연장매출', 80000, '2025-08-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5d3554aa-2bc9-4ac1-8405-79a1ab83d1be', 'すまはぴかふぇ', '연장매출', 35000, '2025-08-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0ce39cd7-3415-4ba9-902e-b0a0ec387cc2', '小松崎祐太', '연장매출', 54545, '2025-08-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('280c9203-82ca-4a58-a641-8fd410fc4226', '小松崎祐太', '연장매출', 54545, '2025-08-07'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ac9e592f-5da6-4ae1-a115-d349c2c378c0', 'カタヤマ タツミ', '연장매출', 70000, '2025-08-12'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e31be21a-72e1-4ee0-a673-ac94801168b5', 'Unknown_371', '신규매출', 4800, '2025-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2d9108e5-b2bc-4c57-9fd9-85d3700b1d33', 'イーストナイン', '연장매출', 150000, '2025-08-04'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0670e410-aa87-4d99-944a-5b3a311a2c9d', '高橋涼介', '연장매출', 80000, '2025-08-14'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5f4ae220-164c-4cc8-9801-684a69d20a7a', '株式会社CR Vision', '연장매출', 300000, '2025-08-15'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('97ce8576-7f18-4d7d-ac59-0b93f11af688', '楠彩花', '연장매출', 80000, '2025-08-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ab8badd9-ed8b-4c03-bb0a-8df99f8058ea', '株式会社わかば', '연장매출', 114726, '2025-08-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4e23410e-2695-455c-a848-d8b9aa9baac9', '創彩鉄板ほおずき', '신규매출', 50000, '2025-08-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('57d8e9cf-d16d-4e03-843f-72090dab040d', '株式会社アチーブ', '연장매출', 40000, '2025-08-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('5d5608e0-7f9f-4c43-88e5-bf427510ea8e', '株式会社トラフィックラボ', '연장매출', 240000, '2025-08-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6c18e03c-2681-4059-81d3-295c99df4f72', '星野翔太', '연장매출', 30000, '2025-08-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('18e6be09-8dd0-4c40-8d87-80694c1a17a3', '峯 愁矢', '연장매출', 72727, '2025-08-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1f9d186d-3928-4180-a958-2fb267035500', '村上翼', '연장매출', 20000, '2025-08-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c3e7a2a8-d043-46ee-8743-08af2ea58bb2', 'HIKARI屋', '연장매출', 30000, '2025-08-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('525ebb1c-ceb8-4757-bcb5-3b7981ea8b25', 'ネイティブキャンプ', '연장매출', 239090, '2025-08-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0830f82c-ffee-41d3-932a-fff8a860806c', '株式会社efub', '연장매출', 20000, '2025-08-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('50082d72-1fae-46f9-850b-0748787f6106', '野中美里', '연장매출', 22500, '2025-08-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4b403d04-3524-4093-af9a-adc9f71e3426', 'la studio', '연장매출', 50000, '2025-08-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('12cfd148-e3b3-4bcd-86b2-1c97ecddaad1', '株式会社オールディッシュ', '연장매출', 150000, '2025-08-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e792b279-c0bd-4853-aa0c-8658b255bc91', 'イーストナイン', '연장매출', 200000, '2025-09-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('534615c5-1fe9-469f-bd21-1bc678b84ed9', 'Cafe Madu ENOSHIMA', '신규매출', 15000, '2025-08-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('828deb8d-6a85-4e91-bdba-bf5d17421835', '馬場春樹', '연장매출', 50000, '2025-09-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cf7513b8-e962-4f47-9466-d408aa44b3c0', 'browtique', '연장매출', 80000, '2025-09-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3f40369c-4105-43df-bd55-7eecd0cf8b91', 'すまはぴかふぇ', '연장매출', 35000, '2025-09-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('385ca3ef-6dbf-4f18-afb8-90107f4978e2', '山崎美雪', '연장매출', 50000, '2025-09-11'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%石井瞳%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bd9d3620-fdf0-45f7-9e5d-49a086016b66', '株式会社エモーション', '신규매출', 113000, '2025-09-05'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('be9df8fc-1eae-4086-a568-e9c005409836', 'merci 石本 良太', '연장매출', 50000, '2025-09-10'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('586a0296-8eec-46b9-8b32-cca3a906c03c', 'Unknown_397', '연장매출', 70000, '2025-09-20'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('03cbc8cd-0451-43a4-8128-482db237119a', '株式会社CR Vision', '연장매출', 300000, '2025-09-18'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('e65f5907-36bb-49af-976f-ee572817fc0a', '株式会社トラフィックラボ', '연장매출', 240000, '2025-09-22'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('3cee76f0-62b6-4ccc-a013-e282bcdec4bf', '株式会社わかば', '연장매출', 95000, '2025-09-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('82ea9db4-28d5-4757-8b57-2ae1bab49211', '峯 愁矢', '연장매출', 72727, '2025-09-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f6ef49fd-f3e4-4590-ac34-2a23922f7c94', '高橋涼介', '연장매출', 80000, '2025-09-24'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('bdb35262-fb2d-4692-ac8e-25ba09ba2ac2', 'Cafe Madu ENOSHIMA', '신규매출', 1500, '2025-09-17'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7dc45437-d9b5-42d7-9238-4cb9c7a41ab6', '楠彩花', '연장매출', 80000, '2025-09-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('10773818-6438-4936-9fbb-e17d8d2469a8', 'browtique', '연장매출', 80000, '2025-09-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('36364178-b739-4e2a-bdc6-824e5e940a5c', '馬場春樹', '연장매출', 50000, '2025-09-25'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('481d6567-6cac-4254-9685-13786c721a25', '村上翼', '신규매출', 30000, '2025-09-26'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('f7ec68e5-1a9a-4b0f-9c3e-6ebc1814991a', 'HIKARI屋', '연장매출', 30000, '2025-09-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('a93dbec0-0a70-4691-bfb4-c3321b8ab21d', '星野翔太', '연장매출', 30000, '2025-09-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('955a26bb-b3e6-4e57-94bf-73b9005c6bce', 'la studio', '연장매출', 50000, '2025-09-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('67d55fde-1b6a-4608-b2c9-5b2182572037', 'ユミ', '신규매출', 2000, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('11aa173f-1ec6-4442-bf6d-ed5910cae5bb', 'イーストナイン', '연장매출', 200000, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9477f14e-b7ca-4fb7-a2fb-fb9c65d75647', 'Cafe Madu ENOSHIMA', '연장매출', 60000, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0b84cca1-63d0-4fb0-8041-3b0b291312c3', '株式会社オールディッシュ', '연장매출', 150000, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('28cb676c-c2c2-4986-8f50-cf77338a622e', '株式会社アチーブ', '연장매출', 40000, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('02cf6bad-ac23-4294-9a43-d3d9bf0a73ac', '野中美里', '연장매출', 22500, '2025-09-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('94b3663c-b2cd-4f18-a3ac-c8a31bcc3383', '増田栄里', '신규매출', 1363, '2025-10-03'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6d2a2075-26d8-46ab-8c7c-a268141ddc2f', 'ネイティブキャンプ', '연장매출', 239090, '2025-10-02'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('7d14259f-6124-44d9-911a-a29f78df3165', '株式会社わかば', '연장매출', 15000, '2025-10-01'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('178795c2-d507-47a9-9bba-6c20b86467bb', '寺川陸斗 | 埼玉市グルメ', '연장매출', 16500, '2025-10-08'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('acdbdd11-1575-4bdd-afd5-7c38c9eae6d2', '株式会社カルミネーション', '신규매출', 40000, '2025-10-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('73628f9f-6432-4edc-b4f6-e3de236693ef', '株式会社CR Vision', '연장매출', 300000, '2025-10-21'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('2713bdf7-55f2-430a-b473-b6cabc0264dc', '峯 愁矢', '연장매출', 72727, '2025-10-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('01bb7131-d34f-4934-b661-95ca58b9ceda', '株式会社わかば', '연장매출', 125000, '2025-10-23'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('642829c8-4b82-4582-9652-a9e8c7f801c0', 'browtique', '연장매출', 80000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('dd86b9c1-ab0a-4e8b-838e-80bf44236f72', '株式会社トラフィックラボ', '연장매출', 120000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('400003a6-b108-49e3-8295-92c93d715ed1', '高橋涼介', '연장매출', 80000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('119c04a5-61dd-4dda-9d6f-3663bd17fb5a', '株式会社エモーション', '연장매출', 113000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('164b25c2-85fd-4ac8-9036-2a71fa4f488a', '馬場春樹', '연장매출', 50000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('ad3c4f64-faed-4cdd-8187-b454d8fd80ac', '楠彩花', '연장매출', 80000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('1a1ca2c5-51cf-40c9-8d80-42fc24a74ff1', 'カタヤマ タツミ', '연장매출', 70000, '2025-10-27'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山下南%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('4a46a900-7d58-4faf-83a8-12d236419f05', '星野翔太', '연장매출', 30000, '2025-10-28'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('092bc539-d303-4fbf-94fb-2665c0affa33', 'ミツイシ ユキ', '신규매출', 30000, '2025-10-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%김제이%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('cb912686-8d27-4dce-aabc-7c7336741a0d', '株式会社CIEL.', '신규매출', 30000, '2025-10-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('c1f44fdf-fc73-4522-8ffc-1e949f08291a', 'la studio', '연장매출', 50000, '2025-10-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('6e468641-732e-46e1-a207-d3091697f4be', '株式会社CIEL.', '신규매출', 30000, '2025-10-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('9340905c-a129-49d0-ab12-d3957c6db9cf', '株式会社CIEL.', '신규매출', 30000, '2025-10-29'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('91bee44a-042e-4e6a-ac8b-6567a1c7c844', '門脇 文武', '신규매출', 30000, '2025-10-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('305f8b8d-989b-419a-bb2b-df70b008fab0', 'ブライダルプラス', '신규매출', 30000, '2025-10-30'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());
INSERT INTO sales (id, company_name, sales_type, amount, contract_date, user_id, created_at) 
VALUES ('0e826440-12b7-4dab-9f11-df4090bd4724', 'イーストナイン', '연장매출', 200233, '2025-10-31'::date, 
  COALESCE((SELECT id FROM users WHERE name LIKE '%山﨑水優%' LIMIT 1), 
           (SELECT id FROM users LIMIT 1)),
  NOW());

COMMIT;
