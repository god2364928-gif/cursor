BEGIN;

-- Clear existing payments
TRUNCATE TABLE payments CASCADE;

-- Insert payments from CSV
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8d6b235c-cacb-4fb5-95ce-abff9f19f08e', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（2/3）', '2024-06-09 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d145a90d-b435-4012-8ab8-da13b5975821', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（2/12）', '2024-06-21 00:00:00'::timestamp, 95454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('41de712a-03f8-4629-baf7-ee5229380822', 'epi', 'パクジュヨン', 'リグラムサービス（1/6）', '2024-06-22 00:00:00'::timestamp, 29090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ee408bfe-459e-4a85-8080-7f67184ec826', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-06-29 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f857638b-f934-44b8-9b61-d051067fa3b3', 'merci 石本 良太', 'イシモト　リョウタ', '顧客アカウント人気投稿サービス（1/3）', '2024-06-06 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('adb1fb0a-0268-4f17-9eec-0cade322ad37', '桃花', '', '外国人フォロワー400名追加', '2024-06-20 00:00:00'::timestamp, 1181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1dfa6b07-a1ef-47ba-86a1-d7b4ceafa344', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）', '2024-06-28 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('64138616-f36d-4820-a687-9fda1b5aed4f', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（1/3）', '2024-07-27 00:00:00'::timestamp, 109090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9a07544e-0059-40be-ad92-4e1efff2d98b', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（3/12）', '2024-07-21 00:00:00'::timestamp, 95454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9fb1c2fd-5f98-4064-819c-65a9bb01ac52', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（4/12）', '2024-08-21 00:00:00'::timestamp, 95454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8041efd0-36f8-45c6-9fbc-d78222391004', 'epi', 'パクジュヨン', 'リグラムサービス（3/6）', '2024-08-22 00:00:00'::timestamp, 29090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('dcc4716d-f555-4d67-a388-a2625953b1f3', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（2/3）*医療コンサル', '2024-08-04 00:00:00'::timestamp, 109090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ef350d42-2783-4d70-9869-d85f396846f4', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（1/3）', '2024-08-01 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6e085361-b08f-45df-93ef-da27d3fc2c05', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）*グルメ', '2024-08-02 00:00:00'::timestamp, 154545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1cc1473e-d0cc-4e03-bf01-77deb52ddc17', 'merci 石本 良太', 'イシモト　リョウタ', '顧客アカウント人気投稿サービス（3/3）', '2024-08-05 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5debba2e-19d9-4b6d-83d5-56f2331e3661', '', 'ナカムラ　ホノカ', '顧客アカウント人気投稿サービス（2/3）', '2024-08-20 00:00:00'::timestamp, 63636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('71d441e3-f0a1-41dd-bab7-f0571e29fe09', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（3/3）*美容狂女', '2024-08-20 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d091893b-ccd9-4e97-b143-7363987be870', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '日本人フォロワー15000名', '2024-08-20 00:00:00'::timestamp, 136363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0e78cc2b-5977-483c-8472-52a6609351ac', '伊藤由真', 'イトウユマ', '日本人フォロワー1000名', '2024-08-01 00:00:00'::timestamp, 12272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('98988155-3a8a-4071-a8de-c9448d484d0a', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*ファッション', '2024-08-20 00:00:00'::timestamp, 154545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b27f82c2-2f0a-4aad-837f-a6d0ab100e51', '', '', 'リグラムサービス', '2024-08-07 00:00:00'::timestamp, 31818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5fd8b88f-b8e6-4ae3-aedb-fb9809923c97', 'Sun Tribe miyakojima', '', 'リグラムサービス（1/2）*PAYPAY', '2024-08-07 00:00:00'::timestamp, 9090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cb53d574-5f62-47c0-84cd-7e0e45d9d03d', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（1/6）', '2024-08-14 00:00:00'::timestamp, 106363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2be72fbb-d358-49db-9ad5-0e3fbbd7fbdf', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（5/12）', '2024-09-21 00:00:00'::timestamp, 95454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cb8d1c76-dc40-4984-a352-426522881d83', 'epi', 'パクジュヨン', 'リグラムサービス（4/6）', '2024-09-22 00:00:00'::timestamp, 29090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('974b03cf-9727-4115-8c4c-0324fefc001b', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（2/3）', '2024-09-04 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f833444f-8d50-4095-89dd-cf21f98781e3', '', 'ナカムラ　ホノカ', '顧客アカウント人気投稿サービス（3/3）', '2024-09-20 00:00:00'::timestamp, 63636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ed74dccb-d731-44a2-9bf5-f9e84f13e771', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（3/3）*ファッション', '2024-09-23 00:00:00'::timestamp, 154545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6a215549-b54e-4fcc-b407-ef911e61cea4', '清水 政隆', 'シミズマサタカ', '顧客アカウント人気投稿サービス（2/3）', '2024-09-06 00:00:00'::timestamp, 113636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f70a75ab-707c-4470-949d-2b0aa354844c', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（2/6）', '2024-09-09 00:00:00'::timestamp, 106363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fe836b8a-bef6-4dc7-a79e-b63707af5dab', '', '', 'リグラムサービス（1/6）', '2024-09-09 00:00:00'::timestamp, 101818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('069ba2a7-c1cb-464a-911e-eb4f1e4682ff', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2024-09-09 00:00:00'::timestamp, 136363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('546a14d4-d11f-476c-8332-bd991f9312d0', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-09-28 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4bc4c6a8-69a7-4551-8889-e07a65d5209a', '株式会社CR Vision', 'カ）シーアールビジョン', 'リール再生回数', '2024-09-09 00:00:00'::timestamp, 27272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('136ebcbf-7cab-44ac-bc9e-d76350693230', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）*美容狂女', '2024-09-23 00:00:00'::timestamp, 109090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a6d06670-2ce5-47b0-bdf5-52070e574037', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（1/9）', '2024-09-06 00:00:00'::timestamp, 13636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bb7da1c1-ba39-4f6d-bb98-f80dfe67fe7b', 'MB Medical Artmake', '', 'リグラムサービス', '2024-09-19 00:00:00'::timestamp, 57272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('362498b9-2741-49c7-918f-bc3b07a501b2', '株式会社P.C.G', '株式会社P.C.G', 'フォロワー購入', '2024-09-20 00:00:00'::timestamp, 2363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('76dfa93f-5a18-4cc6-b2a4-8dbd53c12fb5', 'KIRENAL', '', 'フォロワー購入', '2024-09-20 00:00:00'::timestamp, 11818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7d1a6dd1-2717-4af1-a933-a74510fcf01d', '國分大輔', '', 'フォロワー追加＆投稿上位サービス(1/3)', '2024-09-23 00:00:00'::timestamp, 227272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bab54eea-5dfe-475d-b9df-8bd98bc3c72a', '松倉陸', 'マツクラリク', 'アカウント管理一部（いいね・フォロワー増加）', '2024-09-25 00:00:00'::timestamp, 18181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ae752433-ee1e-4359-be70-4996f4054593', '株式会社CR Vision', 'カ）シーアールビジョン', 'リール再生回数', '2024-09-30 00:00:00'::timestamp, 27272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('507a5a19-2cc0-4a4f-864b-ab79d69c34d4', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス', '2024-09-27 00:00:00'::timestamp, 136363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('56fb3b77-be1d-4123-a376-934d25072b2c', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（6/12）', '2024-10-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f58edce5-345b-48bd-abb7-4f970f26f54d', 'epi', 'パクジュヨン', 'リグラムサービス（5/6）', '2024-10-21 00:00:00'::timestamp, 32000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('94a16af5-2aaf-4b2c-ac83-2e28bec707f7', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（1/12）', '2024-10-08 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('410345d4-61b7-4deb-805b-e774ef687c33', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（2/9）', '2024-10-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2565ef26-e1f8-4058-8161-7e0e01081e84', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（1/3）*医療コンサル', '2024-10-02 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('eb022c27-ebef-447a-9c98-95fdba350d0d', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（3/3）*グルメ', '2024-10-02 00:00:00'::timestamp, 170000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('dd501946-01ba-4a05-9ecc-56f93cb162eb', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）*ファッション', '2024-10-25 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6ca584d0-a103-4761-a898-9d81713562bb', '清水 政隆', 'シミズマサタカ', '顧客アカウント人気投稿サービス（3/3）', '2024-10-07 00:00:00'::timestamp, 113636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d45187e2-56a2-4978-a15c-6a426272b917', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（3/6）*タベルナ', '2024-10-10 00:00:00'::timestamp, 106363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('eafef130-c47b-4c3c-95e1-084031344fdd', '', '', 'リグラムサービス（2/6）', '2024-10-10 00:00:00'::timestamp, 101818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8bdbbe4e-df07-4ced-90f6-9097148a9458', '株式会社CR Vision', 'カ）シーアールビジョン', 'アカウント管理*和心', '2024-10-10 00:00:00'::timestamp, 45454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('65f224ce-f0ee-4009-8624-35512f7d26cd', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-10-30 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8b962a6d-5599-4f65-a0df-a95298376672', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2024-10-14 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4bdaf585-4a69-433c-b24d-19ab22999e3c', '株式会社ALLURE', 'アリユール', 'リグラムサービス', '2024-10-04 00:00:00'::timestamp, 118181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c5f9f637-64e2-4408-ae61-21ebe8177d80', '渡部幸司', 'ワタベコウジ', 'フォロワー＆いいね追加', '2024-10-01 00:00:00'::timestamp, 18181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('793f2ba2-6604-4951-904f-68362978dea6', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*美容狂女', '2024-10-23 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('acde0a40-318b-48fe-8e58-653f3bc1a4f5', '山本さきこ', '山本さきこ', 'いいね＆フォロワー追加', '2024-10-10 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('18787f2d-ba7e-4225-910a-fbb855b8ad99', '株式会社ALLURE', 'アリユール', 'フォロワー追加', '2024-10-10 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('48eba078-7475-4f22-9ef5-2365fc28530b', '亀山友佳', 'K nail atelier', 'フォロワー＆いいね追加', '2024-10-09 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7ea2ac76-c661-4637-95db-5981a43b130c', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2024-10-18 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7c556229-6d95-44d2-aa64-77f8d4bf26f7', '', '', 'フォロワー追加　確認', '2024-10-25 00:00:00'::timestamp, 11700, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('911e43eb-f541-4a89-8ef6-d97d90e50f83', '株式会社OTTOGIマシジョア', 'マルジョア', 'リグラムサービス', '2024-10-25 00:00:00'::timestamp, 63636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('61f212ae-c015-442b-8d41-9fc90e824555', '星野翔太', 'ホシノショウタ', 'リグラムサービス', '2024-10-28 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4965aee6-3b61-4465-9641-fd7bd0459b8c', 'TRUE DESIGN CLINIC', '廣瀬はるか', '顧客アカウント人気投稿サービス（7/12）', '2024-11-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d58cf1ad-b0f5-40d1-bc6a-0ba22be2d245', 'epi', 'パクジュヨン', 'リグラムサービス（6/6）', '2024-11-22 00:00:00'::timestamp, 32000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8900702a-f13e-4ef5-b20d-80fdf578e74e', 'TRUE DESIGN CLINIC', '廣瀬はるか', '顧客アカウント人気投稿サービス*差額（3/9）', '2024-11-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('19c3039b-06a1-41fb-84cc-918c2de68052', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（2/12）', '2024-11-05 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c10ccee4-7276-4575-9a50-7f8b24704a5c', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（2/3）*医療コンサル', '2024-11-13 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('872ea138-1e8c-4956-beae-05e2871cf83f', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）*グルメ', '2024-11-13 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4887f3a1-0b59-4972-9b2b-2c593d844ba5', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（4/6）*タベルナ', '2024-11-12 00:00:00'::timestamp, 106363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('78c4491f-5e77-4345-b885-93e636a21529', '', '', 'リグラムサービス（3/6）', '2024-11-12 00:00:00'::timestamp, 101818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('05521cb8-dce4-41c7-a45f-d9a6faaee19d', '株式会社CR Vision', 'カ）シーアールビジョン', 'アカウント管理*和心', '2024-11-12 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2e8cd34f-d3eb-4fff-8189-d8c666ee9f0e', '松倉陸', 'マツクラリク', 'アカウント管理一部（いいね・フォロワー増加）', '2024-11-08 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bbe85f29-78b7-4eae-9151-04cdff125796', '', 'ナカムラ　ホノカ', '顧客アカウント人気投稿サービス*1ヶ月追加', '2024-11-05 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2f03a2d3-b2d7-4654-9af8-3d65ecbf5fcc', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2024-11-14 00:00:00'::timestamp, 330000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d2d1933a-15ec-4227-be40-b4aeb1941f42', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス*下北沢', '2024-11-14 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('18e5566d-3f47-4fb7-9d45-1ecd4d641e94', '山本さきこ', '山本さきこ', 'いいね＆フォロワー追加', '2024-11-12 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('87fbe345-c3d6-425b-98f1-cb1d73478496', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2024-11-13 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('980d9abf-ff99-4461-a63c-9193f76ea7f5', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス', '2024-12-21 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5e3fe7de-c038-4dd8-b3eb-dd48f3360503', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（4/9）', '2024-12-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f2629c42-f2f0-4694-bdca-a032d09dacc8', '株式会社ALLURE', 'アリユール', 'フォロワー追加', '2024-10-15 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c2d4d3d6-d088-4c6a-b5de-9dd83a4ed204', '株式会社efub', 'カ）エフビー', 'リグラムサービス', '2024-10-23 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a305750e-56eb-4941-bfb9-11ff601f418f', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス', '2024-10-30 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('71c3e298-7b44-43e3-8568-ba3fbcfeb2c6', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（1/3）', '2024-05-09 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7b8a9c62-3867-427d-a08c-685618513327', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（1/12）', '2024-05-21 00:00:00'::timestamp, 95454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f0bd1c49-2423-4c12-8738-ea70faf567b7', 'epi', 'パクジュヨン', 'リグラムサービス', '2024-05-22 00:00:00'::timestamp, 36363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9e3bb396-14bc-496a-a381-347f52314d5e', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-05-29 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7fddf927-ba58-4a81-a817-760596c4dc33', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（8/12）', '2024-12-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9a532cb9-0df1-4bf7-8c37-cd327f0da082', 'epi', 'パクジュヨン', 'リグラムサービス（1/6）', '2024-12-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f05c648f-e459-4e58-aa13-c58ee910aad8', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（3/12）', '2024-12-09 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b6f6695a-0150-46c7-bcc1-fab7a3fb51eb', '今井佑宥', 'イマイ', '1000人フォロワー', '2024-12-02 00:00:00'::timestamp, 11000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4d098908-1e63-47a3-b46b-5163eeb51310', '', 'オノザワリョウ', 'いいね、フォロワー、保存', '2024-12-05 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8ae72911-496a-49b0-b7a6-e54f7f4edd24', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス 中目黒焼肉 登牛門', '2025-01-30 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1424fbe9-399d-497a-94bd-06c0e39d9a03', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス錦糸町 KAMAKURA', '2025-01-30 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('87358a03-7739-43f8-aa85-46f4230943ac', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'アカウント管理', '2024-12-13 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e2200cc5-e66d-4861-903a-18f93c46f6b6', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（3/3）*医療コンサル', '2024-12-06 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c70db33d-1bbe-4e2a-bd8c-2fbfae9f1e12', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（5/6）*タベルナ', '2024-12-16 00:00:00'::timestamp, 106363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('677d7e2e-4bdc-4404-8938-fa8e03ac70bc', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（4/6）', '2024-12-16 00:00:00'::timestamp, 101818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e380d3f4-72d9-4e31-ba30-beb6aa2a74be', '株式会社CR Vision', 'カ）シーアールビジョン', 'アカウント管理*和心', '2025-01-23 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2333e0a5-220a-4ad8-bc2e-aa80deb6ae80', '株式会社CR Vision', 'カ）シーアールビジョン', 'リール再生', '2024-12-16 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4fdeea31-c8df-4378-9ce3-3e456534a251', '亀山友佳', 'K nail atelier', 'いいね、フォロワー', '2024-12-09 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ff99c766-1db6-404d-a36b-cec377739135', 'browtique', 'browtique', 'アカウント管理', '2024-12-13 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c1fd8405-798e-4868-acfb-d7d5b4c34dcf', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2025-03-24 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('900696a0-e976-4569-a145-c6a133a72b19', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2024-12-20 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ffe4a56d-5eba-4bf4-b6a7-49cb06db1d55', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2024-12-26 00:00:00'::timestamp, 330000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7f93c5e0-2fd3-4f6c-a40d-f6bee847af9b', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（3/3）*ファッション', '2024-12-14 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6e6cd238-269d-47eb-a07d-fb36b12c1333', '株式会社ALLURE', 'アリユール', 'いいね、フォロワー、保存', '2024-12-17 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a2c77955-9ef0-4908-b5fd-207c41110977', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', '顧客アカウント人気投稿サービス（1/3）', '2024-12-25 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('121d6556-416e-43f2-b15a-583364178a51', 'イーストナイン', 'カ）イーストナイン', '投稿上位露出サービス（1/3）', '2024-12-27 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('44f83d2c-e474-4189-8eb0-649322ffeaa9', '', 'カ）エフビー', 'リグラムサービス', '2024-12-31 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5bc9bc55-cb01-49cd-86b0-4981c4854b91', '山本さきこ', '山本さきこ', 'リール再生', '2024-12-26 00:00:00'::timestamp, 2500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('12d9ad6c-0c94-4837-8033-ac0020dda701', '山本さきこ', '山本さきこ', 'リール再生', '2024-12-16 00:00:00'::timestamp, 2500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('72dff796-e3cb-4f0a-add2-d87cbc4e524d', '村上翼', 'ムラカミツバサ', '投稿上位サービス（1/3）', '2024-12-25 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c85e2059-092f-44cd-b470-6e532aac20d3', 'YUMI', 'yumi', 'リール再生', '2024-12-16 00:00:00'::timestamp, 10500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d4165342-4395-4ed2-a206-16a591a2594a', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（9/12）', '2025-01-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ad0b5ca4-1253-4cc2-8794-72437e3dc63b', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（5/9）', '2025-01-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c6e2bce9-6c17-46f6-898e-1d3929d3a1af', 'epi', 'パクジュヨン', 'リグラムサービス（2/6）', '2025-01-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('db716d08-f9ae-4e86-b3b4-fcf27f989595', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（4/12）', '2025-01-08 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e50a36ca-445a-45ff-8e40-7b0fd0b2b82c', 'browtique', 'browtique', 'アカウント管理', '2025-01-14 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e01b5c13-75ff-4b5a-8ee4-ff50bd6d1ebf', 'browtique', 'browtique', 'リグラムサービス', '2025-01-14 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('165a78cf-cf27-4a6c-86bd-8487830d45dd', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（6/6）*タベルナ', '2025-01-23 00:00:00'::timestamp, 106364, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fe1aa7ba-17c5-4dbe-a856-0b285b8be8dc', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス（5/6）', '2025-01-23 00:00:00'::timestamp, 101818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('897fe8d3-e991-45e7-82ae-5e612389c8a8', '株式会社CR Vision', 'カ）シーアールビジョン', 'アカウント管理*和心', '2024-12-16 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ae1b9733-2ce2-49d4-85a2-c9aedd233b2b', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（_biyou.tankyu_）*1/28～2/27', '2025-01-10 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('485dff1f-35a9-4a7f-958a-32b5d0258875', 'ネイティブキャンプ', 'ネイティブキャンプ', '顧客アカウント人気投稿サービス、検索最適化', '2025-01-10 00:00:00'::timestamp, 448485, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('37f5e567-2d11-4424-968c-f2696d86f8e0', '伊藤由真', 'イトウユマ', '日本人フォロワー', '2025-01-15 00:00:00'::timestamp, 90000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ed32d3f4-10a5-4065-b352-1277727d479e', 'UcanB美容外科・皮膚科', 'UcanB美容外科・皮膚科', 'リグラムサービス（1/3）', '2025-01-21 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('64e3b20a-3d38-4708-b70d-abe7bdc0afa7', '山本さきこ', '山本さきこ', 'リール再生', '2025-01-09 00:00:00'::timestamp, 5000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aa323512-3d6a-4a22-8bbd-d99ca7d011bf', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス　#新宿', '2024-12-13 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('260973a9-0f16-48d5-93a3-a8826b4b3fa0', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2025-03-31 00:00:00'::timestamp, 485000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('42bbd628-4aea-4d9f-a943-d0aabdec6b43', 'イーストナイン', 'カ）イーストナイン', '投稿上位露出サービス（2/3）', '2025-01-31 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c7930445-aabe-4dc0-8269-52e88c2cd2a2', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', '顧客アカウント人気投稿サービス（2/3）', '2025-01-27 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('babac329-51e7-4d2f-8680-053a60a9275c', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-01-27 00:00:00'::timestamp, 330000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9b91cde4-6132-45be-84ba-b4898d4b03b8', '', 'カ）エフビー', 'リグラムサービス', '2025-01-31 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d661f316-b665-424b-a498-527dfa2b154c', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2024-12-13 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('01982f4f-83e2-49e3-86cf-721021014bb5', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス', '2024-12-13 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('39ea16e7-c246-495e-bbde-90a2eedefec9', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'アカウント管理新宿 KAMAKURA', '2025-01-21 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('18fa1e94-4086-4a5f-896f-ce1f1d17b39c', '山本さきこ', '山本さきこ', 'リール再生', '2025-01-30 00:00:00'::timestamp, 2500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e5eb3495-3391-4b66-9cc7-c33f51a84568', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（10/12）', '2025-02-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0661ce61-5514-4495-b203-c5dfd26b452b', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（6/9）', '2025-02-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('93e1e983-8ff9-4763-9771-b51f05f310ab', 'epi', 'epi', 'リグラムサービス（3/6）', '2025-02-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('dafc80a8-5d8d-4b68-b37b-37e33b6949af', 'YUMI', 'yumi', 'アクション数値', '2025-02-03 00:00:00'::timestamp, 3000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5238ef3a-c8b7-469b-bbc8-b24a9824c19c', '株式会社ALLURE', 'アリユール', 'フォロワー＆エンゲージ追加　アリユール', '2025-02-06 00:00:00'::timestamp, 67000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e34243b6-698c-46ad-b690-4b74c0f3dc72', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（5/12）', '2025-02-10 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8255c621-73d4-4b14-8416-7e80388364a5', '村上翼', 'ムラカミツバサ', '顧客アカウント人気投稿サービス', '2025-02-10 00:00:00'::timestamp, 75000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ded41e2f-fb23-4c8b-a74f-69c13606e0da', 'browtique', 'browtique', 'リグラム＆アカウント管理', '2025-02-07 00:00:00'::timestamp, 130000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9821763d-8d59-44fd-8a29-6681d46417df', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス', '2025-02-12 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d568fc2c-86be-4a89-8e77-9f1681b723ad', '株式会社エモーション', 'カ）エモーション', 'アカウント管理 浦和けむり', '2025-02-12 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('28ebc151-4c66-405e-b5f2-4f4f51ddc41d', '山本さきこ', '山本さきこ', 'リール再生', '2025-02-12 00:00:00'::timestamp, 5000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fa470094-a790-49ea-9862-85f84ffceb43', '', 'イノセンス', 'リグラムサービス　イノセンス（カ', '2025-02-14 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1bf473e2-f823-4f6b-9cff-8562026a4de3', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス　カ（ワカバ', '2025-01-20 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('821d6f9a-d309-4ac6-a10f-d666ae23cff8', 'ネイティブキャンプ', 'ネイティブキャンプ', '2アカウント運用', '2025-02-25 00:00:00'::timestamp, 448485, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f0620223-0cf5-4dcb-902b-a232c884daea', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2025-04-24 00:00:00'::timestamp, 485000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6d1b5644-d749-4b0a-8346-ca9bcbe50afd', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス', '2025-03-18 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('94f31b56-d789-42a6-bddb-d6c090d4a609', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-02-28 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('732adbb3-0961-4c75-960d-b176365202db', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス＆アカウント管理', '2025-02-28 00:00:00'::timestamp, 370000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1ba5bc0d-96db-4038-b431-1c9500958834', 'イーストナイン', 'カ）イーストナイン', '顧客アカウント人気投稿サービス', '2025-02-28 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('080d8275-0cb0-43f4-b4e4-edc066a74b62', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-02-28 00:00:00'::timestamp, 480000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cddb124a-fe61-4f27-add4-d180c47b7bd6', '', 'カ）エフビー', 'リグラムサービス', '2025-02-28 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('917f4582-101e-4495-a078-a38d9ac2b590', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（11/12）', '2025-03-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bd3cbb6d-28ed-4072-9253-f07403f58440', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（7/9）', '2025-03-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2c6a49e1-3d7c-4e10-8be5-ac2ec34b3ee9', 'epi', 'パクジュヨン', 'リグラムサービス（4/6）', '2025-03-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('54148cd7-291c-4679-b094-70777c63f644', '馬場春樹', 'ババハルキ', '投稿上位サービス（1/3）ババハルキ', '2025-03-01 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('be980c9b-7469-4a8a-af8e-7fab8a7e593e', '山本さきこ', '山本さきこ', 'リール＆LINE友達追加', '2025-03-05 00:00:00'::timestamp, 9300, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f9af7fd5-b04f-4baa-943f-b9572f6e8ef5', '', 'モリタトモヒサ', '投稿制作　モリタトモヒサ', '2025-03-05 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4100969c-6487-466f-9506-76ac9510e07e', '株式会社アチーブ', 'カ）アチーブ', 'アカウント管理（1/6）カ）アチーブ', '2025-03-07 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cad32d67-d07d-4116-85cd-a4cb853003d3', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（6/12）', '2025-03-10 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d5c32d5b-9146-49ce-8dfb-c48bf7082c15', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位サービス', '2025-04-18 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7c9277af-78df-484c-88f2-42fdaf5d3ea4', '村上翼', 'ムラカミツバサ', '投稿上位サービス', '2025-03-10 00:00:00'::timestamp, 75000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('55705d97-f847-45b8-9632-6bc77d487750', '', 'イノセンス', 'リグラムサービス　イノセンス', '2025-03-17 00:00:00'::timestamp, 140000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a5cc5d9e-77a8-4aec-ad09-d7281c8c462f', '株式会社エモーション', 'カ）エモーション', 'アカウント管理', '2025-03-17 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5c836edf-a835-46f6-ae81-cf19ea502633', 'ユミ', 'yumi', 'リール再生', '2025-03-18 00:00:00'::timestamp, 1000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cc0ebef9-deea-414a-8b4a-64f51af1b705', 'ユミ', 'yumi', 'いいね・保存　おでかけ', '2025-03-19 00:00:00'::timestamp, 200, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('41261305-23d6-41f8-a183-2c67ffcb0842', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス　ワカバ', '2025-02-19 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('04df6437-4aab-4bde-a9e5-2bd22a4225d0', '吉田淳一', 'ヨシダジュンイチ', 'いいね・フォロワー', '2025-03-25 00:00:00'::timestamp, 9000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aa95f5e5-c5e1-4cb9-989d-1e30f0492f39', '増田栄里', 'ますだえり', 'いいね・フォロワー　ますだえり', '2025-03-26 00:00:00'::timestamp, 5000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c9480bbd-e817-4148-bad2-f91923bd5c80', '山本さきこ', '山本さきこ', '画像制作', '2025-03-27 00:00:00'::timestamp, 1000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('012136d8-242b-4f2d-bc97-d45722353aef', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-03-28 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cf78bd13-b1b6-4a88-a25e-de7cae404c05', 'ネイティブキャンプ', 'ネイティブキャンプ', '育成＆リグラムサービス', '2025-03-28 00:00:00'::timestamp, 448485, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6b4d3201-4c44-4725-a2e3-f9bf1a1b5cec', 'イーストナイン', 'カ）イーストナイン', '投稿上位サービス', '2025-03-31 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('65b0a674-5d3a-438d-8094-cd9ca39696dd', '', 'カ）エフビー', 'リグラムサービス', '2025-03-31 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bb4408ce-54f6-45e1-9354-4eb14ba0b2d5', '株式会社わかば', 'カ）ワカバ', 'アカウント管理　ワカバ', '2025-03-31 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8884f19b-2a2f-4566-9490-6ade67d69c18', '馬場春樹', 'ババハルキ', '投稿上位サービス（2/3）　ババハルキ', '2025-04-01 00:00:00'::timestamp, 100800, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('26644d6c-2a30-407e-ad04-c54504029fc3', '山本さきこ', '山本さきこ', 'リール再生', '2025-04-04 00:00:00'::timestamp, 5000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6906b3b5-6966-4290-9689-9a7dc313ed5b', '高橋涼介', 'タカハシリョウスケ', '投稿上位サービス（1/3）*LINE営業', '2025-04-04 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0b5c76ce-e40f-4488-8e0d-200e0dd63bc0', 'YUMI', 'yumi', 'フォロワー追加　yumi', '2025-04-07 00:00:00'::timestamp, 7500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e3e4e79f-7ef8-4bc3-9695-6a057c699c20', 'YUMI', 'yumi', 'リール再生　yumi', '2025-04-09 00:00:00'::timestamp, 500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aea80024-5c20-49cf-9af7-3c7fff7ed0da', '株式会社エモーション', 'カ）エモーション', 'アカウント管理（横浜居酒屋）', '2025-04-08 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4bb778bb-3379-4459-bdc0-7316f4dd155b', '峯 愁矢', 'ミネシュウヤ', '投稿上位サービス', '2025-04-09 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1f186bd1-29d4-4805-aa18-048f47e31842', '株式会社ALLURE', 'アリユール', 'フォロワー購入　アリユール', '2025-04-09 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3a96a814-61e7-49d2-8cdc-6f988b21f78b', '上濱理奈', '上濱理奈', 'エンゲージ追加　上濱理奈', '2025-04-14 00:00:00'::timestamp, 4000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d352d481-c132-4f92-95ce-dc7aaabe8832', 'キクタミキ', 'キクタミキ', 'エンゲージ追加　キクタミキ', '2025-04-17 00:00:00'::timestamp, 4545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('618d0d50-523b-46d1-b689-1028f3d4bd5f', '株式会社エモーション', 'カ）エモーション', 'アカウント管理（浦和居酒屋）', '2025-04-17 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a5c8c6f1-b928-46fd-886c-2f44adc6c183', '株式会社アチーブ', 'カ）アチーブ', 'アカウント管理　アチーブ', '2025-04-18 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('68fd744d-0d2a-4efa-9779-479587510da2', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位サービス', '2025-03-07 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f9d3abb4-3686-4299-9dc5-ce490314daee', 'ネイティブキャンプ', 'ネイティブキャンプ', '投稿上位サービス', '2025-04-21 00:00:00'::timestamp, 318181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('76281d05-f81f-4ef6-a7a0-324a2929d39b', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス　ワカバ', '2025-03-19 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('01a31f26-1eb8-469f-b104-0a53aea970c6', '村上翼', 'ムラカミツバサ', 'アカウント管理', '2025-04-24 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ce597856-a24b-4843-80c3-985a0cb694bc', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス（12/12）', '2025-04-21 00:00:00'::timestamp, 105000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a8a99230-4b6c-42f5-b6c1-b611989b67d0', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（8/9）', '2025-04-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cfdba3ba-46e3-4c0a-bffe-7bf3bd8c3c85', 'doppler.new', 'doppler', 'アカウント管理', '2025-05-30 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a8f4f9ff-32fa-4115-90db-acbe32eb2d3e', '吉田淳一', 'ヨシダジュンイチ', 'エンゲージ追加', '2025-04-24 00:00:00'::timestamp, 9000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0769b173-755f-4513-98cd-3c7734811031', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2025-02-25 00:00:00'::timestamp, 485000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fbbe4dad-c95b-40ad-bdcc-319d34545be9', '', 'ワダナギサ', '投稿上位サービス　ワダナギサ', '2025-04-26 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a98c8218-d83f-4552-8117-486a2f7381fe', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-04-28 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a2a0e38a-7a57-4a8e-b271-35ae54c490a4', '', 'カ）エフビー', 'エンゲージ追加', '2025-04-30 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('15fe76fe-9584-474e-ab48-c87f91baa0a4', 'イーストナイン', 'カ）イーストナイン', '投稿上位サービス', '2025-04-30 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4b1defbb-312c-4a33-b751-bd13cb29bb9c', 'YUMI', 'yumi', 'エンゲージ追加　yumi', '2025-04-30 00:00:00'::timestamp, 2000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('42fa41ef-5c3b-4649-ae3e-0e76e92946c1', 'epi', 'パクジュヨン', 'リグラムサービス（6/6）', '2025-05-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('78a8a519-d897-4054-9d76-1b52784a1748', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リグラムサービス', '2025-05-28 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d2944af8-699e-45c8-b402-f3655773c625', 'ネイティブキャンプ', 'ネイティブキャンプ', '投稿上位サービス', '2025-05-29 00:00:00'::timestamp, 318181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4873e0e7-88b4-453c-9ff6-2c1f4d7cf613', '山本さきこ', '山本さきこ', 'エンゲージ追加', '2025-05-02 00:00:00'::timestamp, 3500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6348050e-d5d4-4cfc-9260-f0e900b9c12a', '野中美里', 'ノナカミサト', 'アカウント管理', '2025-05-31 00:00:00'::timestamp, 45000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('03f000ea-c44e-4357-97c1-eedac77e8ad6', '渋澤樹里', 'シブサワジュリ', 'エンゲージ追加', '2025-05-21 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('478fc37a-3c02-42e7-b1b8-d0188e77dde6', '', 'モリタトモヒサ', 'リポスト', '2025-05-31 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c204da82-aa92-4117-873e-3408f4749b2b', 'HIKARI屋', '', '投稿上位サービス', '2025-05-15 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('55d7d7da-b055-4dec-bcd5-88b356bbc126', '', 'ワダナギサ', '投稿上位サービス', '2025-05-28 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('369533ed-90c2-4e1e-9bac-70f184d3fb46', '株式会社エモーション', 'カ）エモーション', 'アカウント管理', '2025-05-21 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('781083a1-d3d1-4543-afdc-1752e038bcd6', '峯 愁矢', 'ミネシュウヤ', '投稿上位サービス', '2025-05-09 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7e819ea0-5456-41e5-878a-7e1a929ef527', '', 'メリード', 'エンゲージ追加', '2025-05-15 00:00:00'::timestamp, 290, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0be9ec92-5df2-4acd-a9d9-e43f29731c1a', '', 'ババハルキ', '投稿上位サービス', '2025-05-01 00:00:00'::timestamp, 99200, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aaf2cbc2-6add-45d9-b155-4cf3fb996801', '', 'イシイミカ', 'リグラムサービス', '2025-05-20 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e2ce2ea0-0ff4-4cda-8829-703adb5c6bfd', '高橋涼介', 'タカハシリョウスケ', '投稿上位サービス', '2025-05-13 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aec70f9f-4e68-4672-8049-a5f7e014e386', '村上翼', 'ムラカミツバサ', 'エンゲージ追加', '2025-05-27 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1b1cd2d5-dd59-42f0-9607-5a68d6cf7f93', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト（渋谷先払い分）', '2025-06-02 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('dfcff50e-f6ab-4123-9292-50357f325739', 'スマート健康クリニック', 'イリョウホウジンシャダンシワカイ', 'エンゲージ追加', '2025-06-04 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('67ad6205-ea76-4653-8890-a9d5594feb82', '清水 彰人', 'シミズアキト', '日本人フォロワー15000名', '2024-07-27 00:00:00'::timestamp, 136363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('012342f0-d2e0-4e59-b3e4-a972d85acd84', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）', '2024-07-28 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ef9f7f8b-328e-4f6f-bfde-3cafde5cc904', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-12-20 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('70a529a3-623e-4b8d-bca6-470514607e41', '湊谷千春', '', '日本人フォロワー1000名', '2024-07-30 00:00:00'::timestamp, 12727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3a218daf-f28d-408a-828c-1eb5990f5018', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（1/3）*ファッション', '2024-07-31 00:00:00'::timestamp, 154545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('03fd246c-2022-4392-83bf-0072aa077fcf', '藤枝麻美', '', '顧客アカウント人気投稿サービス（2/3）', '2024-08-08 00:00:00'::timestamp, 109090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('26bf6d25-c7eb-4522-b92f-4b90fac671a3', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-08-30 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ea41cc65-c3a5-428d-b4e0-f50c95f022f7', 'Sun Tribe miyakojima', '', 'リグラムサービス（2/2）*振込', '2024-08-08 00:00:00'::timestamp, 31818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('712cd336-6ae6-4538-8654-c62d835a7141', '清水 政隆', 'シミズマサタカ', '顧客アカウント人気投稿サービス（1/3）', '2024-08-09 00:00:00'::timestamp, 181818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d423c07a-dde2-48fd-8425-4599ee7a3fad', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（3/3）*医療コンサル', '2024-09-02 00:00:00'::timestamp, 109090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1b39d11a-5842-4a82-bcbc-4604c4b1d1bb', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*グルメ', '2024-09-02 00:00:00'::timestamp, 154545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('63cf747c-566b-4f35-b6e1-26a102b4a859', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*ファッション', '2024-11-25 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fbe8f14b-c9e5-4d1f-8469-f3607561da35', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-11-25 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6eabfd1b-7fe2-44a5-81f5-02ddd337e5fc', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（3/3）*美容狂女', '2024-11-25 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('726cdab4-ce94-4d39-ae6f-81a6fbb2c2a8', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス', '2024-11-29 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('13d1399f-0455-4f7d-a467-77c4b5ca5dad', '', 'カ）エフビー', 'リグラムサービス', '2024-11-29 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('09537c6d-41a6-4460-a36f-898f8b1f803a', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2024-11-28 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('34056d84-7429-4f20-92f1-cfd0cced3384', 'browtique', 'browtique', 'リグラムサービス', '2024-11-29 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('363f50a3-c4e7-43e4-8152-17d059e7ba7f', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス*池袋', '2024-11-29 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ad21d263-405a-4f84-b5e9-0b76f69e5d20', '亀山友佳', 'K nail atelier', 'いいね・フォロワー*引継ぎ', '2024-11-08 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bac2dfdf-304e-4fcd-bff9-194086dd64f8', '株式会社CR Vision', 'カ）シーアールビジョン', 'リグラムサービス', '2025-02-26 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8309c4fe-8c66-46d7-9332-e54cd71145d5', '峯 愁矢', 'ミネシュウヤ', '顧客アカウント人気投稿サービス（3/3）', '2024-07-09 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('496713e5-e296-4a3b-b20f-a462cbc65616', '藤枝麻美', '', '顧客アカウント人気投稿サービス（1/3）', '2024-07-09 00:00:00'::timestamp, 90909, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('85cd6fdc-0f3d-4a4a-aab1-e5fa59506297', 'merci 石本 良太', 'イシモト　リョウタ', '顧客アカウント人気投稿サービス（2/3）', '2024-07-06 00:00:00'::timestamp, 81818, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b990896e-858b-467e-86c1-dc1ac37a03da', '株式会社トラフィックラボ', 'カ）トラフィックラボ', 'フォロワー4000名', '2024-07-17 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e5ff81ab-d4d0-4a56-a90c-d415f9a7c3ec', 'epi', 'パクジュヨン', 'リグラムサービス（2/6）', '2024-07-22 00:00:00'::timestamp, 29090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4ba230e0-3d5a-48c8-9339-bbddd27771f0', '', 'ナカムラ　ホノカ', '顧客アカウント人気投稿サービス（1/3）', '2024-07-23 00:00:00'::timestamp, 63636, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('eb173ff5-e2fd-4a81-8b89-f2e44e28460c', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2024-07-30 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c2f6566a-8e80-4f74-a831-f1a2835dd8c4', '清水さん', '', '投稿上位サービス', '2024-12-06 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4548fb87-969e-49a5-aea5-4fed4e4078b0', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2024-12-01 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ff4058dd-7933-429c-8003-44916219fd25', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*グルメ', '2024-12-14 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3d15ff0a-6bb9-4cf8-9a79-3fc6bb893ea4', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2024-12-01 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('45e02e1e-3417-4084-a6dc-ee8ee1341bb9', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2024-12-01 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8fea0b4e-6809-4d9b-944c-9ff0f6a61f97', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '顧客アカウント人気投稿サービス（2/3）*美容', '2024-12-14 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('620f9e7b-89aa-4113-9ad3-fae489bf9654', '株式会社IFREA DINING', 'カ）イフリアダイニング', 'リグラムサービス　#新宿', '2025-01-01 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ebd5b73b-7102-4069-a1de-e24e932211f3', 'TRUE DESIGN CLINIC', '廣瀬はるか', 'リグラムサービス', '2025-01-01 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('154b2ff0-09d0-4b73-aa5a-3e55b0340290', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2025-01-20 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2718148f-11b4-4a45-9320-8aa614e86156', '清水 彰人', 'シミズアキト', '顧客アカウント人気投稿サービス（beauty_guidance.1）*1/7～2/6', '2025-01-10 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4afe1d9c-ab7f-430c-9c44-2bef847aebd4', '株式会社エモーション', 'カ）エモーション', 'リグラムサービス', '2025-01-22 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a7b3575f-c116-40b8-ad3d-8268691f4db8', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス池袋', '2025-01-31 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e339f877-f89c-48bb-8ab5-7e3da6066668', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス 下北沢', '2025-01-31 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7156fa1a-30bc-47d3-b336-e92091f1e3fb', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス 渋谷', '2025-01-19 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('78e9edd5-3f2e-4d04-9962-8de4c2f919f4', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス（渋谷）', '2025-02-19 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c67a8876-a10e-4136-b569-fb32d2ebaed8', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2025-02-28 00:00:00'::timestamp, 200000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('add9f535-9408-4234-a020-2c3f9f2021cf', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス（渋谷）', '2025-03-26 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('095ed018-62f5-4a83-9bf8-2d5c9df70998', 'ユミ', '', 'リール再生　おでかけyumi', '2025-03-25 00:00:00'::timestamp, 1000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2b65cd46-a3dc-4604-98d6-875f1271495d', 'YUMI', 'yumi', 'リール再生', '2025-03-01 00:00:00'::timestamp, 1000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5a7ed9e4-25f0-4233-8564-13f28afd078a', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2025-03-01 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('25d4dc38-0de2-4ef6-aff2-472b0131bf80', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス（渋谷）', '2025-04-25 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f5e0e297-856f-475e-8616-b22f14828637', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2025-04-21 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('abb1b4e4-0d2b-4cf0-b8fb-5ac745f3d5af', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2025-04-01 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fe0d694e-10f9-4076-8d8f-8c528baef141', 'epi', 'パクジュヨン', 'リグラムサービス（5/6）', '2025-04-24 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4268404d-7826-43b5-b09d-7d1e2a95fe71', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス', '2025-04-30 00:00:00'::timestamp, 340000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f8a53acc-9bd3-435b-943f-7eb6fde0851a', '', 'カ）エフビー', 'アカウント管理', '2025-05-30 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('19cc614d-fc08-4a93-8fac-9198a1a951d8', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リグラムサービス（渋谷先払い分）', '2025-05-24 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c40b4ecb-2cdb-4e98-93eb-2b7a79a7f7a8', '株式会社わかば', 'カ）ワカバ', 'リグラムサービス', '2025-05-20 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('da287fbf-5400-4a58-9f1d-48826b54acbb', 'doppler.new', 'doppler', 'アカウント管理', '2025-05-02 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1f4239c2-5932-440c-ae72-12c467c36df2', 'イーストナイン', 'カ）イーストナイン', '投稿上位サービス', '2025-05-31 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('91f6149c-007a-400c-8365-a94fb142eafe', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト', '2025-05-31 00:00:00'::timestamp, 290000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ffa88c3f-d0ac-418e-971b-f8160d08babd', '', 'モリタトモヒサ', 'リグラムサービス', '2025-05-15 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ebc74f2b-5278-461c-9c3f-c8d27db8d87a', 'キクタミキ', 'キクタミキ', 'エンゲージ追加', '2025-05-21 00:00:00'::timestamp, 5000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('01ed1391-e454-4eaf-b121-50746333b43b', 'YUMI', 'yumi', 'エンゲージ追加', '2025-05-11 00:00:00'::timestamp, 7500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ef6a435a-9a49-4703-802a-0ff8c37e82f6', '田中 優奈 フラワーアーティスト', 'タナカ　ユウナ', 'フォロワー追加', '2025-05-30 00:00:00'::timestamp, 4545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f4a3a000-9241-46a9-b322-8843a741ff49', '株式会社アチーブ', 'カ）アチーブ', 'アカウント管理', '2025-05-15 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7ffe9ba9-6bad-4ec6-85ce-8eb7e14fd261', 'TRUE DESIGN CLINIC', '廣瀬はるか', '投稿上位サービス*差額（9/9）', '2025-05-06 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0460282e-9fec-41b6-82cf-30b899eaafcc', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位サービス', '2025-05-15 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('210d84be-2e97-4918-95d9-f56f9c53f029', '株式会社エモーション', 'カ）エモーション', 'アカウント管理', '2025-05-11 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('859a0187-9a61-4672-9435-6d210c250d26', '株式会社わかば', 'カ）ワカバ', 'ブースティング（モニター）', '2025-05-26 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9329dd28-afbb-4bf7-aabe-6829b3587884', '峯 愁矢', 'ミネシュウヤ', '投稿上位露出', '2025-06-06 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('02806c9d-9a9b-4861-a1fe-fa9c8594d459', '', 'カタヤマタツミ', 'エンゲージ追加', '2025-06-06 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5c3d1ea5-7f74-4a29-bcbf-5d5f2146f6d4', '楠彩花', 'クスアヤカ', 'リポスト', '2025-06-09 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d804f8e1-2034-4eea-bc37-b08fc793101e', '馬場春樹', 'ババハルキ', '投稿上位露出', '2025-06-09 00:00:00'::timestamp, 100000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('11d38ebf-8f29-4ab3-afd0-87161a52176d', '', 'イシモト　リョウタ', 'アカウント管理（3カ月契約）', '2025-06-22 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0bf3d718-3b95-4b24-a5af-b0be93e34f82', '八鍼灸院', 'ハヤシミツグ（八鍼灸院）', '投稿制作、エンゲージ追加', '2025-07-08 00:00:00'::timestamp, 10000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('489ae8b4-e59a-41a3-8d77-ac37e8cc4a27', 'the artmake tokyo', 'シャ）ストーリーズクリニクス', 'リポスト', '2025-06-27 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('44eefa82-11d7-4d72-9f9d-c9faa6ef7d05', 'イーストナイン', 'カ）イーストナイン', '投稿上位サービス', '2025-06-30 00:00:00'::timestamp, 136363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3478f868-a76d-4bda-95b5-56bc94681bea', '峯 愁矢', 'ミネシュウヤ', '投稿上位露出', '2025-06-06 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d510a41a-ae48-474c-b509-7f58ba8e39e2', '株式会社アチーブ', 'カ）アチーブ', 'アカウント管理', '2025-06-11 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('348e768b-b1e4-45a6-bf28-8badda358f89', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位露出', '2025-06-06 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cbc02d8d-a521-410b-8933-8b94f0a56edf', 'browtique', 'browtique', 'リポスト', '2025-06-17 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5aa64f02-9ee9-4829-98a6-0b38e860ef13', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト（新宿）', '2025-06-10 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7ce6a17f-f1f3-4ed5-82d5-116d9f4a53b1', '楠彩花', 'クスアヤカ', 'リポスト', '2025-07-09 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('cca07c39-8988-46b5-a4b7-dae46018b099', '株式会社CR Vision', 'カ）シーアールビジョン', 'リポスト', '2025-06-16 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bf2eb09f-7df3-403c-afaa-67af39986d84', '株式会社わかば', 'カ）ワカバ', 'モニタリング（大宮グルメアカ）', '2025-06-14 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('db03dfc6-22c0-47cc-9dc9-73973f204137', '株式会社エモーション', 'カ）エモーション', 'リポスト(翌月分まで)', '2025-06-10 00:00:00'::timestamp, 250000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e46ab7d5-e0da-4b32-895c-9ce4a8bca5a7', '山崎美雪', 'ヤマザキ　ミユキ', 'アカウント投稿露出サービス（3カ月契約）', '2025-06-11 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3f6b69cf-7681-4d78-a4f7-10fa7edf8b08', 'カタヤマ タツミ', 'カタヤマタツミ', '投稿上位露出', '2025-06-11 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7ff631e5-b1ef-4ea0-9b97-c55436d1600f', '株式会社わかば', 'カ）ワカバ', 'リポスト', '2025-06-20 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2731fe34-66d0-4183-98a8-57c8fff0e914', '元橋 啓太', 'モトハシ　ケイタ', 'フォロワー追加', '2025-06-21 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4d5f7c11-9ac5-42a7-ab03-15df3f8783e3', 'epi', 'パクジュヨン', 'リポスト（1/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f27847b3-03ec-4036-9b57-83c01ce3fa03', '高橋涼介', 'タカハシリョウスケ', '投稿上位露出', '2025-06-11 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ec44bcae-1b1a-4d8f-a247-a193600dfc6e', 'doppler.new', 'doppler', 'アカウント管理', '2025-06-27 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c30e8823-0ff9-44f8-a7d4-cba92e025392', 'ネイティブキャンプ', 'ネイティブキャンプ', '投稿上位サービス', '2025-06-27 00:00:00'::timestamp, 318181, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7eb89901-8adc-4e41-8276-932f99da0a96', '', 'ワダナギサ', '投稿上位サービス　ワダ　ナギサ', '2025-06-27 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c8aabcb3-6dbd-4107-bcf0-e6739a492726', '村上翼', 'ムラカミツバサ', 'エンゲージ追加', '2025-06-28 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('93027018-7704-4127-8800-36c6799eca48', '星野翔太', 'ホシノショウタ', 'リポスト', '2025-06-30 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('739422a5-558f-455b-97da-8eeab6dc376d', '', 'テラカワ　リクト', '投稿上位サービス テラカワ　リクト', '2025-06-30 00:00:00'::timestamp, 65000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('48f15c8c-6275-4f18-8b87-b054bb9cc61a', '株式会社efub', 'カ）エフビー', 'エンゲージ追加', '2025-06-30 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c56cc625-2c4f-4072-a573-28fa4bc89719', '株式会社エモーション', 'カ）エモーション', 'アカウント管理', '2025-06-30 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('30f4327c-e2d1-4465-b3c8-ef9f51515285', '株式会社エモーション', 'カ）エモーション', 'リポストサービス　札幌グルメ', '2025-07-10 00:00:00'::timestamp, 250000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bf15375b-16bd-4e54-8582-3d4e6879d85f', '山崎美雪', 'ヤマザキ　ミユキ', 'アカウント投稿露出サービス（3カ月契約）', '2025-07-12 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0ff03482-d1d9-4bfe-b5c4-07f55613db2d', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト（渋谷＆新宿）', '2025-06-30 00:00:00'::timestamp, 270000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('111d73bd-f8f9-4bc5-9eb9-7861be5f9369', 'epi', 'パクジュヨン', 'リポスト（2/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f867af7a-367b-4a4e-8b5c-7f58dc53c67b', 'スマート健康クリニック', 'イシモリ　タツロウ', '自動アクション、5000円分エンゲージ追加（3カ月契約）', '2025-07-02 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5b798183-f730-4d5c-b05c-ab57b7e2823b', '野中美里', 'ノナカミサト', 'アカウント管理（2/3）', '2025-07-02 00:00:00'::timestamp, 45000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9e0967b8-b593-475b-bbc2-e0a8a17836f1', '太田優斗', 'オオタユウト', 'アカウント管理（1/3）', '2025-07-01 00:00:00'::timestamp, 45000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('31c1df42-20eb-4a2e-896c-4e0aa962de8e', '峯 愁矢', 'ミネシュウヤ', '投稿上位露出', '2025-07-09 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('01f34f59-8d0d-4441-81b6-d37f24a44f38', 'カタヤマ タツミ', 'カタヤマタツミ', '投稿上位露出', '2025-07-10 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('31f96787-6777-4ab7-9d64-0228dc82048b', '小松崎祐太', 'こまっくす', '投稿上位露出（1/3）', '2025-07-17 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6cdbbd28-c6e6-44ea-938e-2be22fb1b9ce', 'Cafe Madu ENOSHIMA', 'テラカワ　リクト', 'リポスト', '2025-08-29 00:00:00'::timestamp, 65000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b2ad1aee-d6e6-4f2c-a46c-0a3f64ec0424', 'epi', '', 'リポスト（3/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8c0059e7-504b-4349-a89a-42c552195565', 'epi', '', 'リポスト（5/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b5fcd2ab-e8d1-4cb1-9c8e-d9c11c1f2ebe', 'epi', '', 'リポスト（4/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a7406c0a-de97-4dbc-b8d3-d1e734ef3cde', 'epi', '', 'リポスト（6/6）', '2025-06-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('14029a5a-1da0-44f5-8a52-3fc8d9e9e680', '高橋涼介', 'タカハシ　リョウスケ', '投稿上位露出', '2025-07-06 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('13e3232b-dc07-4306-ad56-626787aa17fd', '馬場春樹', 'ババ　ハルキ', '投稿上位露出', '2025-07-18 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f63b97a7-f5d0-4026-ac16-9ec50d31345b', '株式会社アチーブ', 'カ）アチーブ', 'アカウント自動管理', '2025-07-15 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('95af9a78-f9a1-4bb6-a282-cb08791c90f6', 'browtique', 'パクジュヨン', 'リポスト', '2025-07-12 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('49c8b46e-7329-404c-8063-0e12acd1115c', 'ユミ', 'yumi', 'リール再生10投稿', '2025-07-20 00:00:00'::timestamp, 1000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('23740798-587b-49ca-9f03-24b28cf9916e', 'ユミ', 'yumi', 'AIコメント', '2025-07-11 00:00:00'::timestamp, 500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9bc1a027-905e-43a5-b7a8-57aa11747c31', 'ユミ', 'yumi', 'フォロワー', '2025-07-16 00:00:00'::timestamp, 7500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ad6b3ad2-2e48-4eae-b3e6-5c7c0487230a', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位', '2025-07-16 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b1a45113-a9ef-46b9-9f25-3cc4ced28314', '株式会社CR Vision', 'カ）ＣＲ　ＶＩＳＩＯＮ', 'リポスト', '2025-07-14 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8130a029-feda-416b-a356-f347b8a21af3', '株式会社わかば', 'カ）ワカバ', 'リポスト＆ブースティング', '2025-07-10 00:00:00'::timestamp, 112000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('53e6dbc3-67dc-4436-8c9e-f12f5492a6b9', 'merci 石本 良太', 'イシモト　リョウタ', '投稿上位露出', '2025-08-01 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0d99d34b-1bbe-4b5f-b9ab-457b26138611', 'Sun Tribe miyakojima', 'テラダ　ケンシ', 'アカウント活性化', '2025-07-05 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('852156a4-49cb-48dc-bd61-d214bca9680a', '株式会社オールディッシュ', 'オールディッシュ', 'リポスト（渋谷＆新宿）', '2025-07-30 00:00:00'::timestamp, 270000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('80431058-d01c-488e-bc11-c88dea83f274', '株式会社わかば', 'カ）ワカバ', 'ブースティング', '2025-07-22 00:00:00'::timestamp, 27272, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2c55c362-42ff-4063-b2b3-4e15243ae029', 'ネイティブキャンプ', 'ネイティブキャンプ', '投稿上位露出', '2025-07-24 00:00:00'::timestamp, 159090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c3db55fb-0b1a-4d68-ac5f-994ff4f108c5', 'the artmake tokyo', 'シャ）ザ　ストーリーズ　クリニクス', 'リポスト', '2025-07-29 00:00:00'::timestamp, 400000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9a1f48f2-41ac-4d8c-bc7f-4d252c055b6a', '村上翼', 'ムラカミ　ツバサ', 'エンゲージ追加', '2025-07-30 00:00:00'::timestamp, 30454, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d2d92237-736f-4b27-af38-b467c20518bd', 'Cafe Madu ENOSHIMA', 'テラカワ　リクト', 'リポスト', '2025-07-31 00:00:00'::timestamp, 65000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6e1a200a-993f-420d-92c5-d5c21450a6fd', '株式会社efub', 'カ）エフビー', 'エンゲージ追加', '2025-07-31 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ac168613-dd43-469a-9960-f90f9b26965a', 'la studio', 'ラスタジオヤマダマコト', '投稿上位露出', '2025-07-31 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('76cf8052-334c-4925-8bb8-36971a837613', 'HIKARI屋', 'ヤマグチ　ヒカル', '投稿上位サービス', '2025-08-01 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6e93e7e2-d3f3-4df9-9b40-bcabdb9bb84f', '山崎美雪', 'ヤマザキ　ミユキ', 'アカウント投稿露出サービス（3カ月契約）', '2025-08-01 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2802e2c2-9a56-4dd3-9f85-df88eb316782', 'すまはぴかふぇ', 'イシモリ　タツロウ', '自動アクション（２ヶ月目）、エンゲージ追加', '2025-08-02 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('35eba863-9534-4d8b-92e1-811025401837', '小松崎祐太', 'こまっくす', '投稿上位露出', '2025-08-07 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a3ecdfaa-a782-467b-adb0-2f24f6d6f57d', '小松崎祐太', 'こまっくす', '投稿上位露出', '2025-08-07 00:00:00'::timestamp, 54545, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7faab307-a3c7-423f-b98a-afa31f2b745b', 'カタヤマ タツミ', 'カタヤマ　タツミ', '投稿上位露出', '2025-08-12 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c2bc7b23-5828-4152-b6d8-c4de5d952b10', '', 'ひー', '五木田　妃花', '2025-08-20 00:00:00'::timestamp, 4800, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a88b0552-c3a0-42f7-be08-80a2298c2c8f', 'イーストナイン', 'カ）イーストナイン', '投稿上位露出サービス', '2025-08-04 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('022162e3-f6b5-41f8-af0d-763b07d0174b', '高橋涼介', 'タカハシ　リョウスケ', '投稿上位露出サービス', '2025-08-14 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f3c235a0-42b6-4a4e-b65d-e548cebbd99c', '株式会社CR Vision', 'カ）シーアールビジョン', 'リポスト', '2025-08-15 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6bb43730-c9b7-4e81-bcab-f949517a2085', '楠彩花', 'クス　アヤカ', 'リポスト', '2025-08-18 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b026a40b-fe4a-4a36-bf18-08c16bc94629', '株式会社わかば', 'カ）ワカバ', 'リポスト＆ブースティング', '2025-08-20 00:00:00'::timestamp, 114726, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3e91ddac-908c-4a27-b37a-ed0d498e4196', '創彩鉄板ほおずき', 'ほおずきさん', 'リポスト', '2025-08-21 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8f45c4fe-f850-4bff-b737-38f163ee082f', '株式会社アチーブ', 'カ）アチーブ', 'アカウント自動管理', '2025-08-25 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bd20d2c2-e9b4-4c4a-8b18-f9718b0d45b3', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位', '2025-08-23 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9524acf3-d647-4f36-bc65-1e40d5ca3612', '星野翔太', 'ホシノ　ショウタ', 'アカウント管理', '2025-08-25 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1ccb1ec4-4514-4da7-a574-dc8450199bc6', '峯 愁矢', 'ミネ　シュウヤ', '投稿上位', '2025-08-21 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3cfc6f27-24f3-445e-b5e0-e54f28d3ff50', '村上翼', 'ムラカミ　ツバサ', 'エンゲージ追加', '2025-08-28 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('e7fa814b-b098-4916-b5d0-3774ecfd473d', 'HIKARI屋', 'ヤマグチ　ヒカル', '投稿上位露出', '2025-08-28 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7bdf0b40-53ab-45b1-9dd1-e705d14e4b60', 'ネイティブキャンプ', 'カ）ネイティブキャンプ', '留学投稿上位＋Youtubeエンゲージ', '2025-08-28 00:00:00'::timestamp, 239090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('6da63b0d-e2bc-4156-bad6-54c491aae906', '株式会社efub', 'カ）エフビー', 'エンゲージ追加', '2025-08-29 00:00:00'::timestamp, 20000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1eac0006-c571-4038-b60d-3640f25776a6', '野中美里', 'ノナカ　ミサト', '投稿上位', '2025-08-29 00:00:00'::timestamp, 22500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5d90b97e-6c7f-4b2c-a852-acad02b4d4db', 'la studio', 'ラスタジオヤマダマコト', '投稿上位', '2025-08-29 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a96ef86b-9dc1-457a-b403-50eebbeec2a0', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト（渋谷）', '2025-08-31 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f461b4a7-0325-40d5-93fe-5b280fa103b7', 'イーストナイン', 'カ）イーストナイン', '投稿上位', '2025-09-01 00:00:00'::timestamp, 200000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('45c42b9e-d0ad-4662-b760-7cb2f0488240', 'Cafe Madu ENOSHIMA', 'テラカワ　リクト', 'ブースティング', '2025-08-29 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('89dfb5bc-ea1e-4bbb-b615-cc01af01c2b3', '馬場春樹', 'ババ　ハルキ', '投稿上位', '2025-09-01 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c68aa9a4-25a1-4a60-b2a7-32e255573eaf', 'browtique', 'パク　ジュヨン', 'リポスト', '2025-09-01 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fa040b09-59a5-4bc9-a6d1-be69f1d77a6b', 'すまはぴかふぇ', 'イシモリタツロウ', 'すまはぴかふぇ', '2025-09-01 00:00:00'::timestamp, 35000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('21a68b6f-b90e-49a6-8300-d85dd62f7662', '山崎美雪', 'ヤマザキ　ミユキ', '山崎美雪', '2025-09-11 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('415009f6-0906-46cb-a955-beda8da370f0', '株式会社エモーション', 'カ）エモーション', '投稿上位、リールブースティング', '2025-09-05 00:00:00'::timestamp, 113000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('898d0e1a-649f-42bf-a2a5-e95ddd3d1d87', 'merci 石本 良太', 'イシモト　リョウタ', '投稿上位', '2025-09-10 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a90d639a-2f7b-47c6-b6a5-a9f22a0577fa', '', 'カタヤマ タツミ', '投稿上位露出', '2025-09-20 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4365d18f-0058-4673-a247-7145ad7122bb', '株式会社CR Vision', 'カ）CR　VISION', 'リポスト', '2025-09-18 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ddf5481e-b3d9-43b8-9aef-dd56bccacd40', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位', '2025-09-22 00:00:00'::timestamp, 240000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('0d055a43-eac3-4176-bea7-1c5a75808d94', '株式会社わかば', 'カ）ワカバ', 'リポスト＆ブースティング', '2025-09-23 00:00:00'::timestamp, 95000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('1bb24790-2513-423c-b62f-490bd5f77cef', '峯 愁矢', 'ミネ　シュウヤ', '投稿上位', '2025-09-24 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('4006fee4-205b-4102-bd6b-82494a61fc80', '高橋涼介', 'タカハシ　リョウスケ', '投稿上位露出', '2025-09-24 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('d1a1311e-8c75-4683-9ef1-75ee6a71d8ff', 'Cafe Madu ENOSHIMA', 'テラカワリクト', 'TickTok', '2025-09-17 00:00:00'::timestamp, 1500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9e1b4159-2f0f-4646-8fc4-a149d7cfa70f', '楠彩花', 'クス　アヤカ', 'リポスト', '2025-09-25 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ce3417df-bf29-4656-8798-3118e0a501e4', 'browtique', 'パク　ジュヨン', 'リポスト', '2025-09-25 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c249829b-3ef0-41b7-992a-18744caca9c2', '馬場春樹', 'ババ　ハルキ', '投稿上位露出', '2025-09-25 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('38e09da8-f145-46f5-89ba-65e0e77c1cbf', '村上翼', 'ムラカミツバサ', '投稿上位', '2025-09-26 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('2e05fbae-714d-41a5-8582-0179f83be1cc', 'HIKARI屋', 'ヤマグチ　ヒカル', 'アカウント管理', '2025-09-27 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('137aa558-83f5-4ead-a2d7-3eb73c907326', '星野翔太', 'ホシノショウタ', 'アカウント管理', '2025-09-29 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c123e087-37c8-485e-a042-f5835055724e', 'la studio', 'ラスタジオヤマダマコト', '投稿上位', '2025-09-29 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('784c0a56-5c87-4bdf-9467-a8dd811a67b6', 'ユミ', 'yumi　paypay', 'アクション購入', '2025-09-30 00:00:00'::timestamp, 2000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('068b72ec-3435-498b-8ba3-cede942de329', 'イーストナイン', 'カ）イーストナイン', '投稿上位', '2025-09-30 00:00:00'::timestamp, 200000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b019da16-fa35-4860-acca-aa31135af05d', 'Cafe Madu ENOSHIMA', 'テラカワ　リクト', 'リポスト', '2025-09-30 00:00:00'::timestamp, 60000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('ec2d8879-b0ee-4b18-8651-d4a313e0e5a9', '株式会社オールディッシュ', 'カ）オールディッシュ', 'リポスト（渋谷）', '2025-09-30 00:00:00'::timestamp, 150000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b96c0841-b8ac-4cdb-8234-77317247f003', '株式会社アチーブ', 'カ）アチーブ', 'アカウント管理', '2025-09-30 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('728d81bf-d66e-400a-b556-64f97638d0de', '野中美里', 'ノナカミサト', 'アカウント管理', '2025-09-30 00:00:00'::timestamp, 22500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('3bafb7e6-67d5-42d1-af39-68861d3fe9f6', '増田栄里', 'マスダ', 'フォロワー500名', '2025-10-03 00:00:00'::timestamp, 1363, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('8c31399c-4692-4cbc-a5b8-7e5101f6ca96', 'ネイティブキャンプ', 'カ）ネイティブキャンプ', '留学投稿上位＋Youtubeエンゲージ', '2025-10-02 00:00:00'::timestamp, 239090, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b0d9a225-650d-41b9-87bc-d09a45024229', '株式会社わかば', 'カ）ワカバ', 'ブースティング', '2025-10-01 00:00:00'::timestamp, 15000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('bd0beb89-4a59-4706-8d95-538e57bf384a', '寺川陸斗 | 埼玉市グルメ', 'テラカワ　リクト', 'エンゲージ強化', '2025-10-08 00:00:00'::timestamp, 16500, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7661de16-d8f2-407c-b1d1-614b7ad1c647', '株式会社カルミネーション', 'カブシキガイシャカルミネーション', '投稿上位', '2025-10-21 00:00:00'::timestamp, 40000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a342b55e-0800-4285-826a-89b32277c7fd', '株式会社CR Vision', 'カ）CR　VISION', 'リポスト', '2025-10-21 00:00:00'::timestamp, 300000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a03fa1fe-11a9-45d0-9ada-257e89bd0bdd', '峯 愁矢', 'ミネシュウヤ', '投稿上位', '2025-10-23 00:00:00'::timestamp, 72727, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('7072b492-a67e-444e-86c5-b095f7a78bac', '株式会社わかば', 'カ）ワカバ', 'リポスト・ブースティング', '2025-10-23 00:00:00'::timestamp, 125000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('b9047958-e355-4c55-bfb7-aca4c2aca33d', 'browtique', 'パク　ジュヨン', 'リポスト', '2025-10-27 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('20384552-6d24-4135-b3c6-44c6f3416f9f', '株式会社トラフィックラボ', 'カ）トラフィックラボ', '投稿上位露出', '2025-10-27 00:00:00'::timestamp, 120000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a5ddaf1e-8002-4201-aa8b-550b2ee67987', '高橋涼介', 'タカハシ　リョウスケ', '投稿上位露出', '2025-10-27 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('58036efd-28d0-43b5-87b0-28e1047c92e1', '株式会社エモーション', 'カ）エモーション', 'アカウント管理＋リール', '2025-10-27 00:00:00'::timestamp, 113000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('aa2f7f6e-1f8f-4905-9c47-94a6d6326c6e', '馬場春樹', 'ババ　ハルキ', '投稿上位露出', '2025-10-27 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fa20ec65-6b00-4f04-80e7-92baa2e08eb8', '楠彩花', 'クス　アヤカ', 'リポスト', '2025-10-27 00:00:00'::timestamp, 80000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5b9d3da5-499d-48d5-8522-429035416a6a', 'カタヤマ タツミ', 'カタヤマ タツミ', '投稿上位露出', '2025-10-27 00:00:00'::timestamp, 70000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('5877b5c3-d82d-4169-8372-d70a0dfe17b3', '星野翔太', 'ホシノ　ショウタ', 'アカウント管理', '2025-10-28 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a415f1a5-19d4-4dcf-828a-a2a29cb6b243', 'ミツイシ ユキ', 'YUKI', 'リポスト', '2025-10-29 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('f140190c-10b8-4655-8ee5-363274554b86', '株式会社CIEL.', 'カ）シエル', 'アカウント管理（1/3）', '2025-10-29 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('98fce949-2d4d-4806-84be-4010e4c740b2', 'la studio', 'ラスタジオヤマダマコト', '投稿上位露出', '2025-10-29 00:00:00'::timestamp, 50000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('9563d350-55d9-43b3-9ca5-6bb410ad6f71', '株式会社CIEL.', 'カ）シエル', 'アカウント管理（2/3）', '2025-10-29 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('a1f429a5-d083-41aa-a7f0-bc5b799fe2d1', '株式会社CIEL.', 'カ）シエル', 'アカウント管理（1/3）', '2025-10-29 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('73ae1175-eb65-41e7-af22-dd070e3255c9', '門脇 文武', 'ムタ　トモコ', '投稿制作', '2025-10-30 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('c4fa885c-9fdb-4e79-863f-e20523ac0984', 'ブライダルプラス', 'カ）ブライダルプラス', 'アカウント管理', '2025-10-30 00:00:00'::timestamp, 30000, NOW());
INSERT INTO payments (id, company_name, payer_name, title, paid_at, gross_amount_jpy, created_at) 
VALUES ('fca2ecc7-cd92-44f1-82c0-5eb67f8ba4cd', 'イーストナイン', 'カ）イーストナイン', '投稿上位露出', '2025-10-31 00:00:00'::timestamp, 200233, NOW());

COMMIT;
