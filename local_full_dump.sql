--
-- PostgreSQL database dump
--

\restrict sLqH6vHRfOksA8ffZ4qEqOSclHJuUDguBEgkoIdff9yJRAaPXbYjL5pcfWzXfs8

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customer_history; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.customer_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid,
    user_id uuid,
    type character varying(50) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_name character varying(100),
    is_pinned boolean DEFAULT false
);


ALTER TABLE public.customer_history OWNER TO go;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_name character varying(255) NOT NULL,
    industry character varying(100),
    customer_name character varying(100) NOT NULL,
    title character varying(50),
    phone1 character varying(20) NOT NULL,
    phone2 character varying(20),
    phone3 character varying(20),
    customer_type character varying(50),
    business_model character varying(50),
    region character varying(100),
    contract_history_category character varying(100),
    operating_period character varying(50),
    homepage text,
    blog text,
    instagram character varying(255),
    other_channel text,
    kpi_data_url text,
    top_exposure_count integer DEFAULT 0,
    requirements text,
    main_keywords text[],
    monthly_budget integer DEFAULT 0,
    contract_start_date date,
    contract_expiration_date date,
    product_type character varying(100),
    payment_date integer,
    status character varying(50) NOT NULL,
    inflow_path character varying(100),
    manager character varying(100),
    manager_team character varying(100),
    registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_contact timestamp without time zone,
    last_talk timestamp without time zone,
    last_call timestamp without time zone,
    memo text
);


ALTER TABLE public.customers OWNER TO go;

--
-- Name: payment_types; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.payment_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    label character varying(50) NOT NULL
);


ALTER TABLE public.payment_types OWNER TO go;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid,
    manager_user_id uuid,
    service_id uuid,
    company_name character varying(255),
    title character varying(300),
    payer_name character varying(200),
    paid_at timestamp without time zone,
    created_at timestamp without time zone,
    gross_amount_jpy integer,
    net_amount_jpy integer,
    incentive_amount_jpy integer,
    incentive_month character varying(7),
    payment_type_id uuid,
    fiscal_year_text character varying(50),
    source_note_url text,
    inserted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payments OWNER TO go;

--
-- Name: retargeting_customers; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.retargeting_customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_name character varying(255) NOT NULL,
    industry character varying(100),
    customer_name character varying(100) NOT NULL,
    phone character varying(20),
    region character varying(100),
    inflow_path character varying(100),
    manager character varying(100),
    manager_team character varying(100),
    status character varying(50) DEFAULT '시작'::character varying NOT NULL,
    last_contact_date timestamp without time zone,
    next_contact_date timestamp without time zone,
    memo text,
    homepage character varying(500),
    instagram character varying(500),
    main_keywords text[],
    contract_history_category character varying(100),
    registered_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.retargeting_customers OWNER TO go;

--
-- Name: retargeting_history; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.retargeting_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    retargeting_customer_id uuid,
    user_id uuid NOT NULL,
    user_name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.retargeting_history OWNER TO go;

--
-- Name: sales; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.sales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid,
    user_id uuid NOT NULL,
    sales_type character varying(50) NOT NULL,
    source_type character varying(50),
    amount integer NOT NULL,
    contract_date date NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_name character varying(255),
    marketing_content text
);


ALTER TABLE public.sales OWNER TO go;

--
-- Name: services; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100)
);


ALTER TABLE public.services OWNER TO go;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.teams OWNER TO go;

--
-- Name: users; Type: TABLE; Schema: public; Owner: go
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    team character varying(100),
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO go;

--
-- Data for Name: customer_history; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.customer_history (id, customer_id, user_id, type, content, created_at, user_name, is_pinned) FROM stdin;
35ecebe3-de7b-474b-83f5-cc34af2e8f42	cdaba9a9-adbe-4f2e-8c61-a72500e08984	ca5fb2e2-bff8-4f40-9111-195833c2aace	memo	進捗\n髪質改善の時期が過ぎる夏以降は予約が落ちる傾向にあり、今もお客様は先月の4分の1程度になっている。投稿を頑張ってみる→リポストで表参道美容室など、少し幅を広げた露出カバーを実施	2025-09-22 01:40:00	\N	f
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.customers (id, company_name, industry, customer_name, title, phone1, phone2, phone3, customer_type, business_model, region, contract_history_category, operating_period, homepage, blog, instagram, other_channel, kpi_data_url, top_exposure_count, requirements, main_keywords, monthly_budget, contract_start_date, contract_expiration_date, product_type, payment_date, status, inflow_path, manager, manager_team, registration_date, last_contact, last_talk, last_call, memo) FROM stdin;
c5ceac2b-82c1-426c-bbbe-7b3edd53c2a3	ブライダルプラス			\N	09019842273			\N	\N		\N	\N	https://bridal-plus.jp/	\N	bridal_plus	\N	\N	0	\N	{名古屋結婚式,今後は東京も取りたい}	30000	2025-10-28	2025-10-28	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.635	\N	\N	\N	代表：福手　マーケ：木脇　連絡はスラック
6edc046f-9c17-4a05-b7f8-c06937abd71b	epi	美容/サロン	東京アートメイク, 眉アートメイク	\N	08035666873	07066617306		\N	\N		\N	\N		\N	epi_artmake	\N	\N	0	\N	\N	\N	2024-05-16	2025-10-16	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.581	\N	\N	\N	【顧客メモ】\n-東京上野での韓国人アーティストによる施術\n-露出が一番大事\n-2号店も一緒に実施\n
835e90cb-4211-4457-a59f-b2f83bef3f4c	創彩鉄板ほおずき	飲食店	福岡ディナー	\N				\N	\N		\N	\N		\N	sousaitepanhouzuki	\N	\N	0	\N	\N	\N	2025-08-20	2025-10-20	\N	\N	解約		山下南	\N	2025-10-30 06:13:44.549	\N	\N	\N	
6ae2defc-33e9-4e3a-94fc-e34e9eab5c92	美容ガイダンス			\N				\N	\N		\N	\N		\N	beauty_guidance.1	\N	\N	0	\N	\N	\N	\N	\N	\N	\N	契約中		山下南	\N	2025-10-30 06:13:44.565	\N	\N	\N	
4f66dbf2-2901-4dd2-803f-78df0691bfed	la studio	有形商材	沖縄フォトウェディング	\N				\N	\N		\N	\N		\N	la___studio	\N	\N	0	\N	\N	\N	2025-07-27	2025-10-27	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.567	\N	\N	\N	山田真
ed6e80c1-9521-4f78-a4d6-8328a0075ae2	上濱理奈	その他		\N				\N	\N		\N	\N		\N		\N	\N	0	\N	\N	\N	2025-07-21	2025-10-21	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.569	\N	\N	\N	
ba29fa3d-a47a-4c71-929e-4248717cf276	焼肉29テラス渋谷南口	飲食店	渋谷グルメ	\N	07041515820			\N	\N		\N	\N		\N	29terrace_shibuyaminamiguchi	\N	\N	0	\N	\N	\N	2025-01-21	2025-10-21	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.57	\N	\N	\N	
d1dec82e-9ba7-4b4a-8c70-a44d5823f4a3	esoulage	美容/サロン	脂肪冷却	\N				\N	\N		\N	\N		\N	esoulage	\N	\N	0	\N	\N	\N	2024-09-14	2025-10-14	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.572	\N	\N	\N	青木
80608109-8d53-44ea-8467-6b47b375e671	Sun Tribe miyakojima	娯楽/観光/レジャー	スキンダイビング	\N	09047179278			\N	\N		\N	\N		\N	sun_tribe_miyakojima	\N	\N	0	\N	\N	\N	2025-07-09	2025-10-09	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.573	\N	\N	\N	
4c9749b9-2181-46f5-ba8d-84337f5a5024	めしやアガる	飲食店	千葉グルメ	\N	07010793247			\N	\N		\N	\N		\N	agaruchiba	\N	\N	0	\N	\N	\N	2025-06-09	2025-10-09	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.574	\N	\N	\N	
413264bc-5722-487e-bfdc-98d40163f59a	けむり浦和店	飲食店	浦和グルメ, 浦和居酒屋	\N	07010793247			\N	\N		\N	\N		\N	kemuri_urawa	\N	\N	0	\N	\N	\N	2025-03-14	2025-10-14	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.576	\N	\N	\N	
01fbec74-0703-478e-86d7-908674c6e602	first artmake	美容/サロン	アートメイク	\N	07066617306			\N	\N		\N	\N		\N	first.artmake	\N	\N	0	\N	\N	\N	2024-12-31	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.577	\N	\N	\N	
5764e998-3b2a-410c-8dd7-c717a058148f	りん【京都発】関西子連れおでかけ/子連れ旅	娯楽/観光/レジャー		\N	07023242324			\N	\N		\N	\N		\N	kyoto_memo	\N	\N	0	\N	\N	\N	2024-11-18	2025-10-18	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.579	\N	\N	\N	
cdaba9a9-adbe-4f2e-8c61-a72500e08984	峯 愁矢	美容/サロン	縮毛矯正, 表参道美容室, 髪質改善	\N	09030758641			\N	\N		\N	\N		\N	mine__land	\N	\N	0	\N	\N	\N	2024-05-06	2025-10-06	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.58	\N	\N	\N	
aaddcf90-cf49-4450-957c-5f6099435369	蜂蜜と米（よろずやと一緒）	飲食店	川越食べ歩き	\N	08094424602			\N	\N		\N	\N		\N	cafericeandhoney9　kanmiyorozu	\N	\N	0	\N	\N	\N	2024-05-19	2025-10-19	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.583	\N	\N	\N	鈴木
8d106c5d-2dd6-4ccb-aa9b-4d009fdf78a8	美容探究者	美容/サロン		\N				\N	\N		\N	\N		\N	_biyou.tankyu_	\N	\N	0	\N	\N	120000	2024-06-24	2025-10-24	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.584	\N	\N	\N	代表取締役 清水　マーケティング　岡
645aa55e-2ba1-46f4-81ce-3a3cf1f5c6fe	the artmake tokyo	美容/サロン	アートメイク	\N	07066617306			\N	\N		\N	\N		\N	the_artmake_tokyo	\N	\N	0	\N	\N	\N	2024-12-31	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.585	\N	\N	\N	
baa7d076-63d2-4be6-af36-924773263ef9	魚住	美容/サロン	大阪アートメイク	\N				\N	\N		\N	\N		\N	artmake_n.uozumi	\N	\N	0	\N	\N	\N	2025-04-30	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.587	\N	\N	\N	
7c842d55-b9dd-451c-a027-06e182cbda54	馬場春樹	その他	アート	\N	08021651652			\N	\N		\N	\N		\N	parusui11600	\N	\N	0	\N	\N	\N	2025-03-02	2025-10-02	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.588	\N	\N	\N	
297f3678-d3c1-4336-8c88-e8f72ee762c6	野中美里	美容/サロン	ハイトーンカラー	\N				\N	\N		\N	\N		\N	mo_.0808	\N	\N	0	\N	\N	\N	2025-05-31	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.589	\N	\N	\N	
8887b1a9-9cad-42db-ae7e-82cedb37739f	しなもん堂すすきの店	飲食店	すすきのグルメ, 札幌グルメ	\N	07010793247			\N	\N		\N	\N		\N	shinamondo_susukino	\N	\N	0	\N	\N	\N	2025-06-09	2025-10-09	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.591	\N	\N	\N	
f16170ed-18e1-4064-a6f0-849ae996afef	browtique	美容/サロン	東京アートメイク	\N				\N	\N		\N	\N		\N	browtique_artmake	\N	\N	0	\N	\N	\N	2025-04-05	2025-10-05	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.592	\N	\N	\N	ハン、パク
d2e60e1d-d23b-406f-b8cd-cd8cff1db525	イーストナイン	有形商材	おうちカフェ, おうちスイーツ	\N	0353345751			\N	\N		\N	\N		\N	conaffetto_cake	\N	\N	0	\N	\N	\N	2024-12-31	2025-09-30	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.593	\N	\N	\N	茶谷、松尾
6182410c-aa2e-4c94-8e33-5e65305431e2	村上翼	美容/サロン	大阪髪質改善	\N	08053285937			\N	\N		\N	\N		\N	283hair	\N	\N	0	\N	\N	\N	2024-12-22	2025-10-22	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.594	\N	\N	\N	
8e8ec6fc-ab6d-43b5-9f99-1771c6a71551	ネイティブキャンプ留学	教育	大和グルメ, 大和居酒屋, 海外留学	\N				\N	\N		\N	\N		\N	nativecamp.ryugaku	\N	\N	0	\N	\N	\N	2024-12-31	2025-09-30	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.595	\N	\N	\N	峯岸、関口
9f4b18de-2ac4-4ca1-9e76-74504225d52a	ネイティブキャンプ英会話	教育	津田沼グルメ, 英会話	\N	08013417889			\N	\N		\N	\N		\N	nativecamp.official	\N	\N	0	\N	\N	\N	2024-12-31	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.597	\N	\N	\N	峯岸、佐々木
3f407044-ada5-457a-8e84-bc6dc24299ea	わんこのしっぽ	娯楽/観光/レジャー	東京ドッグラン	\N	0357289328			\N	\N		\N	\N		\N	wankonoshippp	\N	\N	0	\N	\N	\N	2025-03-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.598	\N	\N	\N	ワタナベミサ
cc6c4b38-017d-43d4-ac15-6ad304aee2a6	高橋涼介	美容/サロン	渋谷美容室, 縮毛矯正, 髪質改善	\N	08013935215			\N	\N		\N	\N		\N	ryosuke_hair_st	\N	\N	0	\N	\N	\N	2025-04-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.599	\N	\N	\N	
f5c79637-6397-48b6-ae23-a12e6b8ae1be	太田優斗	美容/サロン	ウルフカット	\N	09080854953			\N	\N		\N	\N		\N	my_by_yuto_ponkan	\N	\N	0	\N	\N	\N	2025-05-31	2025-09-30	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.6	\N	\N	\N	
87fce77d-e0a0-4aa5-9078-76b3028e4c60	doppler.new	その他		\N				\N	\N		\N	\N		\N	doppler.new	\N	\N	0	\N	\N	\N	2025-05-12	2025-10-12	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.601	\N	\N	\N	マエカワケンタ
cc54c79b-c94d-4ab0-a1fa-186986dd586a	HIKARI屋	飲食店	滋賀グルメ, 滋賀ランチ	\N	09058897744			\N	\N		\N	\N		\N	hikariya2014	\N	\N	0	\N	\N	\N	2025-05-19	2025-10-19	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.602	\N	\N	\N	山口光
bbe92aad-df42-4d78-8d35-f82afdb2ec24	Cafe Madu ENOSHIMA	飲食店	江の島カフェ	\N				\N	\N		\N	\N		\N	maduenoshima	\N	\N	0	\N	\N	\N	2025-06-30	2025-09-30	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.603	\N	\N	\N	テラカワリクト
aa615465-ea88-4fe2-b10e-dd650984e29c	だるま津田沼店	飲食店	津田沼グルメ	\N	07010793247			\N	\N		\N	\N		\N	darumatsudanuma	\N	\N	0	\N	\N	\N	2025-06-09	2025-10-09	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.604	\N	\N	\N	
1f0fe08d-e5fe-40ea-8805-679ec4fe4fe5	すみび大和店	飲食店	大和グルメ, 大和居酒屋	\N	07010793247			\N	\N		\N	\N		\N	yamatosumibi	\N	\N	0	\N	\N	\N	2025-06-09	2025-10-09	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.605	\N	\N	\N	
146ef557-4ee9-4d0f-a0ec-409a34ec2197	焼肉29テラス新宿御苑店	飲食店	新宿グルメ	\N				\N	\N		\N	\N		\N	29terrace_shinjukugyoen	\N	\N	0	\N	\N	\N	2025-06-11	2025-10-11	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.607	\N	\N	\N	岩崎
547d5af9-7ea5-4898-8c29-6a583d32511d	楠彩花	美容/サロン	アートメイク東京	\N				\N	\N		\N	\N		\N	ayaka__artmake	\N	\N	0	\N	\N	\N	2025-06-08	2025-10-08	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.608	\N	\N	\N	
cac4bb04-60b5-40ef-9561-b15e5287b923	渋澤樹里	美容/サロン	群馬アートメイク	\N				\N	\N		\N	\N		\N	juri_artmake	\N	\N	0	\N	\N	\N	2025-05-21	2025-10-21	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.609	\N	\N	\N	
315b6915-7b9e-4c2d-ad44-27e42f76ce55	川越3店舗まとめ	飲食店	埼玉グルメ	\N	08021651652			\N	\N		\N	\N		\N		\N	\N	0	\N	\N	\N	2025-02-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.61	\N	\N	\N	やすだ
675e397e-dacc-423d-b906-06577c801e0b	星野翔太	美容/サロン	ピンクカラー, 池袋髪質改善	\N				\N	\N		\N	\N		\N	shota__0411	\N	\N	0	\N	\N	\N	2025-07-06	2025-10-06	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.612	\N	\N	\N	
a2c3b48f-e9db-4bc6-a961-316a0d1a1613	和心	飲食店	川越グルメ	\N	09027663717			\N	\N		\N	\N		\N	kawagoewagokoro	\N	\N	0	\N	\N	\N	2025-02-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.613	\N	\N	\N	やすだ
33f52de1-5dc4-48ab-958c-8cbeb75ffc0f	カフェマグノリア	飲食店	川越食べ歩き	\N	09027663717			\N	\N		\N	\N		\N	cafe__magnolia	\N	\N	0	\N	\N	\N	2025-02-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.614	\N	\N	\N	やすだ
0e1ca9b8-9a9b-4f10-97c0-2055f118b032	taverna	飲食店	川越	\N	08072263066			\N	\N		\N	\N		\N	kawagoe_taverna	\N	\N	0	\N	\N	\N	2024-08-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.615	\N	\N	\N	モリタ
eb862e2e-bf71-4573-be53-453139d074f9	大宮グルメ | 埼玉満載グルメ	飲食店		\N	08076544170			\N	\N		\N	\N		\N	omiyagourmet	\N	\N	0	\N	\N	\N	2025-07-12	2025-10-12	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.616	\N	\N	\N	岡本、鈴木
b0b73ea0-113b-4108-b1c3-b4387738086f	埼玉うまいグルメ	飲食店		\N	08076544170			\N	\N		\N	\N		\N	saitama_report	\N	\N	0	\N	\N	\N	2025-07-17	2025-10-17	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.617	\N	\N	\N	岡本
2e0bb6cc-d793-42f9-8f97-e78808e8ede3	埼玉フード｜SAITAMA FOOD	飲食店		\N	08076544170			\N	\N		\N	\N		\N	saitamafood.tenten	\N	\N	0	\N	\N	\N	2025-07-12	2025-10-12	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.618	\N	\N	\N	岡本　鈴木
a869a548-97ef-4724-b448-42dfa793a4c7	韓国食堂ソウルテーブル	飲食店	下北沢グルメ	\N				\N	\N		\N	\N		\N	kankokushokudo_seoultabl	\N	\N	0	\N	\N	\N	2025-07-21	2025-10-21	\N	\N	解約		山崎水優	\N	2025-10-30 06:13:44.619	\N	\N	\N	
89ab26aa-0ec1-427b-a632-354d26e1b605	メナード　えりな			\N				\N	\N		\N	\N		\N		\N	\N	0	\N	\N	\N	2025-05-14	2025-10-14	\N	\N	購入		石井瞳	\N	2025-10-30 06:13:44.62	\N	\N	\N	
aae612d5-c65e-4fb2-b79c-c167a27db45b	田中 優奈	有形商材	アートメイク	\N				\N	\N		\N	\N		\N	mille_graces	\N	\N	0	\N	\N	\N	2025-05-29	2025-10-29	\N	\N	購入		山下南	\N	2025-10-30 06:13:44.621	\N	\N	\N	
89bdd149-6b2e-48d7-8057-26056f29c15a	スマート健康クリニック	機関/団体	浦和グルメ, 浦和居酒屋	\N	08088347184			\N	\N		\N	\N		\N	smarthealthclinic2024	\N	\N	0	\N	\N	\N	2025-07-10	2025-10-10	\N	\N	契約中		石井瞳	\N	2025-10-30 06:13:44.622	\N	\N	\N	
b4d1b7f8-cc98-4c00-b51f-4bc252fbe64e	すまはぴかふぇ	飲食店	千葉グルメ	\N	08088347184			\N	\N		\N	\N		\N	smile.happy_cafe	\N	\N	0	\N	\N	\N	2025-06-30	2025-09-30	\N	\N	契約中		石井瞳	\N	2025-10-30 06:13:44.623	\N	\N	\N	
7e2bc97b-7bfb-43ce-9966-ab964b7bee89	八鍼灸院	個人利用	スキンダイビング	\N	09056091010			\N	\N		\N	\N		\N	hachishinkyu.higashiku	\N	\N	0	\N	\N	\N	2025-07-08	2025-10-08	\N	\N	契約中		石井瞳	\N	2025-10-30 06:13:44.625	\N	\N	\N	
a7198d72-be19-4a9d-9a06-8d0bd1fdd2b1	山崎美雪	個人利用		\N	09072743971			\N	\N		\N	\N		\N	okashitopan_	\N	\N	0	\N	\N	\N	2025-07-08	2025-10-08	\N	\N	契約中		石井瞳	\N	2025-10-30 06:13:44.626	\N	\N	\N	
43663e69-00c0-436c-858f-9db672813fca	カタヤマ　タツミ	美容/サロン	ミディアムレイヤー	\N				\N	\N		\N	\N		\N	i_am_.tatsu	\N	\N	0	\N	\N	\N	2025-05-26	2025-10-26	\N	\N	契約中		山下南	\N	2025-10-30 06:13:44.627	\N	\N	\N	
42ddcaa7-0a3b-4dbf-8d06-f67503fb850a	元橋 啓太	美容/サロン		\N				\N	\N		\N	\N		\N	ruku_motohashi1209	\N	\N	0	\N	\N	\N	2025-06-19	2025-10-19	\N	\N	解約		山下南	\N	2025-10-30 06:13:44.628	\N	\N	\N	
ac9d0ff2-d949-4689-afb8-5a426a82f497	小松崎祐太	美容/サロン	レイヤーカット	\N				\N	\N		\N	\N		\N	komax1010	\N	\N	0	\N	\N	\N	2025-07-16	2025-10-16	\N	\N	契約中		山下南	\N	2025-10-30 06:13:44.629	\N	\N	\N	
11c755a8-ce9a-481f-a03d-4ca07fa0e21f	埼玉旨いグルメ	個人利用		\N				\N	\N		\N	\N		\N	saitama_umai50	\N	\N	0	\N	\N	\N	2025-09-17	2025-10-17	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.63	\N	\N	\N	岡本、鈴木
81d161cd-7ea2-4c68-b6ce-4f78b1ea327d	履歴管理を開く	個人利用		\N				\N	\N		\N	\N		\N	kikimama_kyoto	\N	\N	0	\N	\N	\N	2025-10-02	2025-10-02	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.631	\N	\N	\N	
ff426ca7-45a9-4a75-83bd-d4e4621e9b08	埼玉市グルメ	個人利用		\N				\N	\N		\N	\N		\N	0	\N	\N	0	\N	{埼玉市グルメ}	0	2025-10-09	2025-10-09	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.633	\N	\N	\N	寺川陸斗
ffb7a1b6-c5df-4e38-b389-c5aeeccd5808	lovin_mana	美容/サロン		\N	09036115522			\N	\N		\N	\N	hashimoto@paragel-salon.com	\N	lovin_mana	\N	\N	0	\N	{肌質改善}	40000	2025-10-20	2025-10-20	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.634	\N	\N	\N	実務者：まなさん　代表：橋本
f1962e54-68a0-4476-8b6f-a52eea0c385f	履歴管理を開く			\N				\N	\N		\N	\N		\N		\N	\N	0	\N	\N	\N	2025-10-28	2025-10-28	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.636	\N	\N	\N	
a4a3efb5-27fd-4544-a57b-cb097cc242a3	齋藤純也	美容/サロン	表参道美容室	\N				\N	\N		\N	\N		\N	jyunya_saito	\N	\N	0	\N	{レイヤーカット,表参道美容室}	40000	2025-10-28	2025-10-28	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.637	\N	\N	\N	齋藤純也
58f08350-8c8d-4fc6-9d88-33afe94ec826	門脇 文武	美容/サロン		\N	09011565907			\N	\N		\N	\N		\N	0	\N	\N	0	\N	{美髪,リバースエイジング}	30000	2025-10-29	2025-10-29	\N	\N	契約中		山崎水優	\N	2025-10-30 06:13:44.639	\N	\N	\N	
0d373860-4efa-463d-bdfe-7b5fe5f65df2	ミツイシ ユキ	教育		\N				\N	\N		\N	\N	https://splaning-japan.com/?fbclid=PAZXh0bgNhZW0CMTEAAae4bbRZ5VFVr51OKd-rNCBpcr7om4JIypi9Cv2uYH3BUIZBCvOG2l3Q-MROhg_aem_-4pEhAGP_rOMsy1P2q9cWg	\N	splaning_japan	\N	\N	0	\N	{サロン経営者向けの技術講座}	30000	2025-10-28	2025-10-28	\N	\N	契約中		JEYI	\N	2025-10-30 06:13:44.638	\N	\N	\N	ミツイシ ユキ
\.


--
-- Data for Name: payment_types; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.payment_types (id, code, label) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.payments (id, customer_id, manager_user_id, service_id, company_name, title, payer_name, paid_at, created_at, gross_amount_jpy, net_amount_jpy, incentive_amount_jpy, incentive_month, payment_type_id, fiscal_year_text, source_note_url, inserted_at) FROM stdin;
\.


--
-- Data for Name: retargeting_customers; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.retargeting_customers (id, company_name, industry, customer_name, phone, region, inflow_path, manager, manager_team, status, last_contact_date, next_contact_date, memo, homepage, instagram, main_keywords, contract_history_category, registered_at) FROM stdin;
56d2b3c1-cbac-439f-8ec2-b1d92acadcd7	リストランテ イル バンビナッチョ_初瀬	\N		09056038096	\N	\N	山﨑水優	\N	開始	2025-07-17 15:00:00	\N	\N	\N	bambinaccio_	\N	過去に返信あり	2025-07-17 15:00:00
049bd0ec-bf20-4bc7-ab5f-be3dc82db83a	鎌倉いくら丼 空丸_川島	飲食店		07074201110	\N	\N	山﨑水優	\N	開始	2025-07-14 15:00:00	\N	\N	\N	soramaru_ikura	\N	無料体験済み	2025-07-14 15:00:00
808e7516-f578-4f18-8ea4-89e4a069db90	徳堂公彦	飲食店		07022187511	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	pokebowl%E2%82%8Bkanaloa	\N	無料体験済み	\N
a1989d1a-d5ff-460f-9609-a971336c0f09	清水大五郎	飲食店		07015432345	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	chacha.futatsume	\N	無料体験済み	\N
284a88d8-e1d1-40c4-8bfb-ee0a57e11765	中村穂乃加	個人利用		08061922432	\N	\N	山﨑水優	\N	開始	2025-09-28 15:00:00	\N	\N	\N	hozzang___1994	\N	過去に契約	2025-09-28 15:00:00
368cb801-41a3-46bf-b926-e8fdbc417972	八巻 典千代	美容師		08033540416	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	acro_wedding	\N	無料体験済み	\N
f2696da0-109d-4fa3-8220-b22505f4572b	湊谷千春	アートメイク		09059502905	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	chiharu__art	\N	過去に契約	\N
66def614-2b1e-472a-8c99-e865d687371b	ながいなか株式会社	フォトウェディング		09019107874	\N	\N	山﨑水優	\N	開始	2025-09-18 15:00:00	\N	\N	\N	note_wedding_page	\N	過去に返信あり	2025-09-18 15:00:00
148f6e5b-b8e4-4d9b-9f8e-964f710093bf	KIRENAL	美容サロン		09039448884	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	kire_nal	\N	無料体験済み	\N
4affc335-cf81-4c3b-ba80-340ef62c3045	coucou.fleur	有形商材		08047006399	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	coucoufleur_	\N	過去に返信あり	\N
c55a7131-1809-4ad8-b397-dde9c17f840c	Angels beauty	アートメイク		09097848148	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	angelsbeautyokinawa	\N	過去に契約	\N
213ddaf8-f0ed-47b1-b284-bcecde9ea4f4	吉永美奈子	個人利用		09033390697	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	harpstar_vega	\N	過去に返信あり	\N
9718a16d-0a49-4481-8e41-0cb73c00c635	オンリーソング	有形商材		08075010617	\N	\N	山﨑水優	\N	開始	2025-08-21 15:00:00	\N	\N	\N	onlysong_story	\N	過去に契約	2025-08-21 15:00:00
2e6baf6e-499d-4df7-b02a-2c80daf5845a	株式会社カルミネーション	まつげ＆ネイル		09036115522	\N	\N	山﨑水優	\N	開始	2025-10-02 15:00:00	\N	\N	\N	lovin_mana	\N	過去に返信あり	2025-10-02 15:00:00
8dd21f28-5bb6-41be-bd11-688fe4e1ca85	Dear beauty salon	美容サロン		08038728602	\N	\N	山﨑水優	\N	開始	2025-08-28 15:00:00	\N	アウトコール	\N	dear_beautysalon	\N	未契約	2025-08-28 15:00:00
b9af6838-1c8e-4c56-b100-fcee064d9534	White Calm 天王寺店	美容サロン		09017130871	\N	\N	山﨑水優	\N	開始	2025-08-25 15:00:00	\N	アウトコール	\N	whitecalm.tennoji	\N	未契約	2025-08-25 15:00:00
ba5b4dc6-8dc2-48ea-9e93-7c122c35dda0	焼肉権助	飲食店		09052066338	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	yakinikugonsuke	\N	\N	\N
6f2d1fe6-987b-4b71-a172-f0a170c73154	https://beauty.hotpepper.jp/kr/slnH000691649/	美容サロン		08064916682	\N	\N	山﨑水優	\N	開始	2025-08-31 15:00:00	\N	アウトコール	\N	omoteari_roppongi	\N	未契約	2025-08-31 15:00:00
50bc6529-4525-4ba7-a0a9-6f235dbb5333	MB Medical Artmake	アートメイク		09083883657	\N	\N	山﨑水優	\N	시작	\N	\N	アウトDM	\N	haruka_mb_artmake	{}	過去に契約	\N
4fcfd8bb-3081-4291-b0e1-05bb6d3b3f3d	福岡カメラマン Anju 深川	フォトスタジオ		09057331626	\N	\N	山﨑水優	\N	開始	2025-10-02 15:00:00	\N	\N	\N	ange0220.miyuki	\N	過去に返信あり	2025-10-02 15:00:00
42a6306a-ec4a-4218-9102-e8befd567554	703スタジオ 韓国フォトウェディング	フォトウェディング		08055333595	\N	\N	山﨑水優	\N	開始	2025-09-01 15:00:00	\N	\N	\N	703studiojapan_official	\N	未契約	2025-09-01 15:00:00
a2363c77-089f-46c0-b8fa-a5717ab4c2ab	細山田　有来	美容サロン		08052199626	\N	\N	山﨑水優	\N	開始	2025-09-18 15:00:00	\N	\N	\N	yuki_eyelash24	\N	無料体験済み	2025-09-18 15:00:00
265179af-4ff4-4266-9de6-696e29e87158	三浦美樹	\N		09013571539	\N	\N	山﨑水優	\N	開始	2025-09-18 15:00:00	\N	\N	\N	mikitty1005_s2	\N	\N	2025-09-18 15:00:00
2e674918-0ea2-4fe3-8c7b-bc20050062d5	和酒和食　恵比寿　黒帯	\N		0362775916	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	ebisu_kuroobi	\N	\N	\N
d48005d3-2390-48ad-89b1-d6513be8474f	SK CLINIC 院長中山	\N		09039031212	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	sk_clinic_ebisu	\N	\N	\N
9162db89-dad5-4969-a233-63d66dbb16dd	フォープレイス	\N		08039776908	\N	\N	山﨑水優	\N	開始	2025-09-18 15:00:00	\N	\N	\N	fourplace_fukuoka	\N	\N	2025-09-18 15:00:00
83e52475-c2e4-4639-a3eb-e9d09e95f130	サロンドコリア　新谷	\N		08066204033	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	salondekorea.official	\N	\N	\N
64bb682c-5279-4dea-bea7-32db7e1a8c2f	伊藤紗里菜	\N		08091742709	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	s__otete	\N	\N	\N
272b25e9-eaee-4c89-a5de-5a6819c2fd23	牟田智	その他		09011565907	\N	\N	山﨑水優	\N	開始	2025-09-24 15:00:00	\N	\N	\N	\N	\N	過去に返信あり	2025-09-24 15:00:00
cfdd4330-4e7c-4b53-8f67-712e669be2b7	株式会社フルラフ	その他		07050455798	\N	\N	山﨑水優	\N	開始	2025-09-24 15:00:00	\N	\N	\N	fitness_gym_nico.official	\N	過去に返信あり	2025-09-24 15:00:00
c4d1e6c6-dd06-429e-b91f-ae8d6c49032d	焼肉いつもここから本店	飲食店		09028155700	\N	\N	山﨑水優	\N	開始	2025-10-06 15:00:00	\N	\N	\N	itsumokoko_kara	\N	過去に返信あり	2025-10-06 15:00:00
be95364d-acba-4206-83a4-485b76eed13f	高田 有燿	美容師		08040190366	\N	\N	山﨑水優	\N	開始	2025-09-21 15:00:00	\N	\N	\N	luau_aryo	\N	無料体験済み	2025-09-21 15:00:00
e79499ad-f09c-4bce-aa2d-7accada1334b	高田 有燿	\N		08040190366	\N	\N	山﨑水優	\N	開始	2025-09-21 15:00:00	\N	\N	\N	luau_aryo	\N	\N	2025-09-21 15:00:00
23596bbd-b665-45c6-8bf3-e3eee29c06db	瀬戸絵里香	\N		09013753074	\N	\N	山﨑水優	\N	開始	2025-10-06 15:00:00	\N	\N	\N	erika_seto310	\N	\N	2025-10-06 15:00:00
dbc97415-28f9-479a-a366-879a35e715ee	Boulangerie Cocoro	\N		09020103206	\N	\N	山﨑水優	\N	開始	2025-10-06 15:00:00	\N	\N	\N	boulangerie_cocoro	\N	\N	2025-10-06 15:00:00
b4279cdd-fb52-487c-ba7b-f00570a01467	やまがBASE	レジャー		09096408812	\N	\N	山﨑水優	\N	開始	2025-10-06 15:00:00	\N	\N	\N	yamagabase	\N	無料体験済み	2025-10-06 15:00:00
db8f9c6f-50ef-48b4-80b9-97103c060f8e	嶺井萌	\N		09068693907	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	andbyuu	\N	\N	2025-10-08 15:00:00
ed5b3d81-5618-4426-9953-6b369d7c7412	ASHTANGA YOGA KANAZAWA	個人利用		393427000000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	studio_a_yoga	\N	無料体験済み	2025-10-08 15:00:00
3b75fa2d-90be-4f5e-b600-aea0aebed068	亀山友佳	\N		09094846014	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	ciela_nail	\N	\N	2025-10-08 15:00:00
6fe8116a-7cd3-42e4-94ed-50b3597f07b7	株式会社Lucca 加藤	\N		08040902550	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	brodo_di_pesce	\N	\N	2025-10-08 15:00:00
4de3a0ce-9606-4c0f-a400-71146e295099	創作中華　寿輝（ことぶき）	\N		0762254708	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	kotobuki_0924	\N	\N	2025-10-08 15:00:00
2194c1c4-46ff-4968-ad95-65a047bd0714	焼きそば専門店焼きそばA	\N		09026136726	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	nc_yakisoba.a	\N	\N	2025-10-08 15:00:00
370b7c0b-8395-45cf-b839-748895bb696c	𝗧𝗛𝗘𝗢𝗗𝗢𝗥𝗜𝗖.𝗱𝘆 [セオドリック.ディ]	\N		07089482135	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	theodoric.dy_official	\N	\N	2025-10-08 15:00:00
96ca2f8b-1d4f-46b1-98df-4abc0dc72944	チャイニーズレストラン　神のもてなし	\N		09045976751	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	kaminomotenashi	\N	\N	2025-10-08 15:00:00
fd00c3cb-d468-4ce3-8a36-2aa7e57715c5	トータルビューティーSARA	\N		0964590650	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	sara_total.beauty	\N	\N	2025-10-08 15:00:00
070ea36e-0f84-42ae-9b1c-d4d0689e4825	カミーユ行政書士事務所　井上卓也	\N		09059702128	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	kamiyugyousei	\N	\N	2025-10-08 15:00:00
d2eaec61-f0dc-4228-9951-64dae03ca77b	Shiki 岐阜カフェ	\N		0583916154	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	cafe_shiki	\N	\N	2025-10-08 15:00:00
08e5d6cf-1a9a-46f9-944b-5e49089e7ecd	仙台美容師　富田敦哉	\N		08028067628	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	a_98828xx	\N	\N	2025-10-08 15:00:00
b6555923-3326-42b3-b4ae-baa8428e8c0f	山田愛 | 東京フォトグラファー	\N		08050073721	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	ai___yamada	\N	\N	2025-10-08 15:00:00
f40a8795-5327-4196-b219-d8723d2f90b4	メンズ脱毛エーデル	\N		09025790801	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	edel_men2023	\N	\N	2025-10-08 15:00:00
fd61473d-2492-4682-beed-a89d4421fb7b	庄司梨花	\N		08027992451	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	kabi_chaaaan2799	\N	\N	2025-10-08 15:00:00
f076cc0c-a10c-48f4-bcbb-31d372e194a2	uura　三浦奨太	\N		08049461013	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	uura.hairsalon	\N	\N	2025-10-08 15:00:00
514227af-5ac1-4209-8eee-25958d2ad124	櫻井 善	\N		07083539757	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	im_zenzen	\N	\N	2025-10-08 15:00:00
a3896073-457b-4e19-a836-88fdaf013865	tryly1171	\N		09094941171	\N	\N	山﨑水優	\N	開始	2025-10-09 15:00:00	\N	\N	\N	tryly1171	\N	\N	2025-10-09 15:00:00
43de71f8-873a-4f22-b22f-403c4b3d4b97	MIKUNI labo.	\N		08019268822	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	mikuni_labo	\N	\N	2025-10-13 15:00:00
4eaf9fc2-b41c-4948-8334-9642f9daf2a5	宇都宮/Melia-private salon-（メリア）	\N		08035692346	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	esthetician_marie	\N	\N	\N
e151ac0c-7a7d-4eef-89ed-80ca7b14191a	ココモンド　湯島	\N		08047311695	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	coco_mondo	\N	\N	2025-10-13 15:00:00
8d5eb4e8-453b-4998-b1d2-1a4c0834c75f	足立区竹の塚　4Care	\N		08049220039	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	4care_inc	\N	\N	2025-10-13 15:00:00
4fcf1f52-ca04-41aa-9b19-aead3e2b2cf6	脱毛＆エステサロンlugna	\N		07020229314	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	lugna_datumou	\N	\N	2025-10-13 15:00:00
bcd52c5b-205e-461b-9d27-1752fca3fbff	肌質改善サロン　南草津BERRY	\N		07047750103	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	berry_103103	\N	\N	2025-10-13 15:00:00
ff4d8022-f118-4d50-9d67-d2df4acb9c5a	ボディケアサロンRELIEVE【レリーブ】	\N		09092297265	\N	\N	山﨑水優	\N	開始	2025-10-14 15:00:00	\N	\N	\N	relieve_salon_	\N	\N	2025-10-14 15:00:00
f060c99d-257b-4c29-bf0a-c79cb135b27c	発光肌サロン  ケアプラス	\N		08043559703	\N	\N	山﨑水優	\N	開始	2025-10-14 15:00:00	\N	\N	\N	careplus0606	\N	\N	2025-10-14 15:00:00
cd480d31-1cb3-479b-a129-0c158674a4c9	reflection 鳥取サロン	\N		07023770640	\N	\N	山﨑水優	\N	開始	2025-10-14 15:00:00	\N	\N	\N	esthetic_salon_reflection	\N	\N	2025-10-14 15:00:00
9926d734-0977-4989-9e9f-517c1d5dedfd	すみれ先生｜現役エステ講師（サロンオーナー・オールハンドアカデミー📍東京・恵比寿）	\N		08051111862	\N	\N	山﨑水優	\N	開始	2025-10-14 15:00:00	\N	\N	\N	esthe_sumire	\N	\N	2025-10-14 15:00:00
3576592a-f671-440f-b778-2713e178b8a6	アリス	\N		09061977369	\N	\N	山﨑水優	\N	開始	2025-10-14 15:00:00	\N	\N	\N	alice._1987	\N	\N	2025-10-14 15:00:00
b88e5bf4-d00f-4bbf-9a74-13cad910db6f	三村沙織	\N		09072196491	\N	\N	山﨑水優	\N	開始	2025-10-23 15:00:00	\N	\N	\N	mimu__photo	\N	\N	2025-10-23 15:00:00
0f8b07b5-38d9-497b-b3c7-17e3a931cc86	Hallbar佐賀店	美容サロン		08047424662	\N	\N	山﨑水優	\N	開始	2025-10-13 15:00:00	\N	\N	\N	hallbar.yukina	\N	\N	2025-10-13 15:00:00
ef16abe1-bef2-45ce-8cd8-3897b29efa05	橋本翔	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-20 15:00:00	\N	アウトDM	\N	sho_hair0615	\N	無料体験済み	2025-10-20 15:00:00
e266dbfd-dd08-4777-9857-086f68749931	j.urbantouch 銀座_Mae	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-14 15:00:00	\N	\N	\N	urbantouch_mae	\N	過去に返信あり	2025-07-14 15:00:00
ce524df7-05a7-4026-a0da-66dca9646501	土居天晴	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-14 15:00:00	\N	\N	\N	luveheartsandbe_tensei	\N	無料体験済み	2025-07-14 15:00:00
f720d5bb-6a87-449e-a3e3-d357469e588c	isuna photo	フォトスタジオ		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-14 15:00:00	\N	アウトLINE	\N	wedding21_japan	\N	過去に返信あり	2025-07-14 15:00:00
3cbef285-16e0-4c46-a8cb-5759d5896abc	Y's Lip Art make_山岸	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-14 15:00:00	\N	\N	\N	yamagishi_lipartmake	\N	無料体験済み	2025-07-14 15:00:00
dd056825-1206-45f6-91d3-b7e8517c9d36	村上あやの	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-09-18 15:00:00	\N	アウトDM	\N	muraoka_ayano_artmake	\N	過去に返信あり	2025-09-18 15:00:00
82a8cf1b-0dfd-46f6-b479-612ad2cfb3b5	長谷川みゆ	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-20 15:00:00	\N	アウトLINE	\N	hasemiyu_artmake	\N	無料体験済み	2025-07-20 15:00:00
aec490a9-6606-4a3b-9f7e-75e1d8ef273d	江島都	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-21 15:00:00	\N	アウトLINE	\N	illdc_artmake	\N	無料体験済み	2025-08-21 15:00:00
f483abf0-a4ea-4eaf-9c7f-29847ecd3bb2	オノザワリョウ	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	ono_ryo_	\N	過去に契約	\N
dd01ad62-2249-4860-9bf8-42a73efc52a0	MEAT BAR GIRASOL	飲食店		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	girasol_kosugi	\N	無料体験済み	\N
1cef6401-17c3-4295-880e-74df55e9e6ef	オンリーワンフォトスタジオ	フォトスタジオ		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	hj_onlyonephoto	\N	過去に返信あり	\N
9e3a87c4-a983-4768-8251-b67776b84cb3	BcBabycare	有形商材		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	アウトDM	\N	bcbabycare_jp	\N	過去に返信あり	2025-10-08 15:00:00
1a2a5397-9416-423e-a377-3903a3ea5e3d	濱真也	有形商材		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	hama.shinya	\N	過去に返信あり	\N
3ddc6d1f-35c9-4040-b75e-bc2a69a956a2	森隆秀	レジャー		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	_tantakamori_	\N	過去に返信あり	\N
5977c5b2-d38b-4570-bee7-f2a87c77613a	Camp Base Kadojin	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	camp.base.kadojin	\N	過去に契約	\N
1b16423d-f2e0-4b4f-add3-60a135a03e80	辻 彪斗	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	ayato_tuji_0317	\N	過去に返信あり	\N
b50d1ac3-3338-4439-b711-784666c42e9c	鮨 悦	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-21 15:00:00	\N	\N	\N	sushi.etsu	\N	過去に契約	2025-08-21 15:00:00
e3e28c4a-5683-4581-a264-976371d416d5	上村愛羅	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	aira.914	\N	過去に返信あり	\N
cab18eae-ce96-403c-8ede-782605ffdb52	八木洸登	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	04yaaa___giii09	\N	無料体験済み	\N
9e812676-c309-4093-a68f-71902112e1d9	クハラ マナミ	美容サロン		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	manami.k32	\N	過去に返信あり	\N
e8923337-7fbb-42ef-a289-ad365d58822b	SHIORI 東京アートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-31 15:00:00	\N	アウトDM	\N	SHIORI	\N	過去に返信あり	2025-07-31 15:00:00
7ab7692e-bde0-45f6-89d9-a0eb5b8abe6a	すし処智	飲食店		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-19 15:00:00	\N	\N	\N	sushi_tomo0610	\N	過去に返信あり	2025-08-19 15:00:00
f1a78e6b-3561-4883-8d33-cc520fef9f5e	仙台美容室_はづき	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-27 15:00:00	\N	アウトDM	\N	ro_.hazuki.2_	\N	過去に返信あり	2025-08-27 15:00:00
e05bcee8-ac79-44f8-a41a-87f03da6c8b8	横浜美容室　長嶋	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-20 15:00:00	\N	アウトDM	\N	line_anchor_nagashima	\N	過去に返信あり	2025-10-20 15:00:00
cf92fb13-4672-4b63-80ce-2f3ec356f0ad	マチアートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-31 15:00:00	\N	\N	\N	machi_artmake	\N	\N	2025-08-31 15:00:00
1fec5029-c9fc-4a7d-9b3f-4615ea700b27	美空miku	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-31 15:00:00	\N	\N	\N	miku_artmake_	\N	未契約	2025-08-31 15:00:00
c0bcd650-cc24-48cd-9ffd-e7439e92597e	元橋啓太	美容師		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-14 15:00:00	\N	\N	\N	ruku_motohashi1209	\N	過去に返信あり	2025-10-16 15:00:00
95d80a34-f743-49c3-9af8-ac6557333206	のえる	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	시작	\N	\N	\N	\N	noel_artmake	{}	過去に返信あり	\N
0b78110a-919d-4c34-b46f-bc277591b456	マツヨシワールドブリーダー	ペット販売		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-09-28 15:00:00	\N	アウトDM	\N	matsuyoshiworld_pet	\N	過去に返信あり	2025-09-28 15:00:00
a01a13be-0f6f-44bd-8803-f8e386137b75	MIYU 東京アートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-09-04 15:00:00	\N	\N	\N	miyu_artmakenurse	\N	過去に返信あり	2025-09-04 15:00:00
be5976b3-c740-4b3d-8d38-a98ecb682ed1	しおり 福岡/東京アートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-31 15:00:00	\N	\N	\N	__0lln__	\N	過去に返信あり	2025-08-31 15:00:00
8e3c2f6b-0453-49cb-9d54-0ffa5e8b251d	Mae | 韓国式アートメイク| 東京銀座	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	maepmu_japan	\N	未契約	\N
67147e27-19ab-48f7-9325-780a8700dffc	野中美里	美容師		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	\N	\N	過去に契約	2025-10-08 15:00:00
00587a68-aa03-43a5-986c-24ae7bd61fb2	小林真緒  アートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-09-04 15:00:00	\N	\N	\N	mao.artmake	\N	過去に返信あり	2025-09-04 15:00:00
1c44b850-9ca4-4f64-9c15-e4290e11883f	clear_node	フォトウェディング		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	アウト	\N		{}	\N	\N
69f7c203-778f-4a65-983d-f812ca0faa76	あじ串 松本大亮	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	\N	\N	\N	\N	ajigushi.kumamoto	\N	\N	\N
7dd6eb7d-ca79-4d2f-a0b9-63809415134f	YOSA PARK lagoon新大久保	美容サロン		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-09-25 15:00:00	\N	\N	\N	yosapark_lagoon	\N	過去に返信あり	2025-09-25 15:00:00
720aecfc-f1aa-4587-979f-982d4d6b7494	まるやま美容クリニック	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-07 15:00:00	\N	\N	\N	maruyama_beauty_clinic	\N	\N	2025-10-07 15:00:00
e36ef3b8-7577-4e09-91d9-1e16da20f9ff	アートメイク菊池	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	rlash_6000	\N	\N	2025-10-08 15:00:00
7380c2c0-e190-4ae2-84d7-e5e14a3fc8b0	GRAIN ON 日本公式	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	grainon_jp	\N	\N	2025-10-08 15:00:00
7049a5f2-c632-4c26-bacb-47e767bf89d5	★スタジオクロリ	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-08 15:00:00	\N	\N	\N	\N	\N	\N	2025-10-08 15:00:00
da5ac573-4ab1-4f57-be14-21cce6f5af37	塚本 征也	2025년 11월 04일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-21 15:00:00	\N	\N	\N	mabo_hair125	\N	過去に返信あり	2025-10-21 15:00:00
709a77ff-8ce3-4f89-a534-0cb400e11b57	齋藤純也/レイヤーカット/表参道↔︎伊勢崎&高崎/群馬美容室	美容サロン		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-20 15:00:00	\N	\N	\N	jyunya_saito	\N	過去に返信あり	2025-10-20 15:00:00
4a5f62cf-c8fa-4ef3-9365-82c9d37b04d6	竹林亮	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-19 15:00:00	\N	\N	\N	ryo_t528	\N	\N	2025-10-19 15:00:00
dd3a5655-3eb5-4846-9971-6d8d6c711371	ピース✌︎RYOHEY	\N		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-10-23 15:00:00	\N	\N	\N	ryohei._official	\N	\N	2025-10-23 15:00:00
42f9c0ff-6cf7-46af-ba16-83977a2bd074	下北沢バルセブン	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	shimokitabar7	\N	過去に返信あり	2025-07-24 15:00:00
96885356-f0a0-4685-98a7-0affc9fbfb41	mmm.mimynail	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-26 15:00:00	\N	\N	\N	mmm.mimynail	\N	過去に返信あり	2025-08-26 15:00:00
cb6ba21d-3004-45fc-9188-38e258def57d	竹内 亜耶	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-29 15:00:00	\N	\N	\N	aya_melissa123	\N	無料体験済み	2025-09-29 15:00:00
31923eac-9d5f-4345-a890-94f9936fb129	上谷 太郎	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-28 15:00:00	\N	\N	\N	loness_taro	\N	無料体験済み	2025-09-28 15:00:00
eed3d020-d6cb-4677-8bc5-ef5e793c24db	梅村 尚輝	2025년 11월 07일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-23 15:00:00	\N	\N	\N	umecchi7	\N	過去に返信あり	2025-10-23 15:00:00
e307fc09-73f0-4d6c-b831-0c9a0dc85c70	尾田一仁	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-02 15:00:00	\N	\N	\N	kaz__hair	\N	過去に返信あり	2025-10-02 15:00:00
270a4860-d840-48f5-826d-71a1453539f8	大内 翔	2025년 11월 06일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	thirdshop_kakeru	\N	過去に返信あり	2025-10-22 15:00:00
ccf6492c-4123-4a36-860d-79e80e620158	宮田 真白	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-05 15:00:00	\N	\N	\N	mashirooooooooooi	\N	過去に返信あり	2025-10-05 15:00:00
c509fd45-6e0f-47dd-8763-705bc703a969	佐藤 夢久	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	muku__1997	\N	過去に返信あり	2025-10-28 15:00:00
a0730784-6240-4ea8-abfa-3058a7e81506	kouki.ukyo	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	omg_ukyo_	\N	過去に返信あり	2025-10-07 15:00:00
ff345395-f5fb-4bbe-8f58-a8a69aa5365a	井戸 達基	2025년 11월 04일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-21 15:00:00	\N	\N	\N	idoooonn	\N	過去に返信あり	2025-09-21 15:00:00
d323728a-d7c5-46a0-bc52-ef58ac1a6bf7	小川 晃司	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-03 15:00:00	\N	\N	\N	kohji.ogawa9	\N	過去に返信あり	2025-09-03 15:00:00
d75fdb01-6673-4293-b8a9-dc4969e965ce	鈴木 佑都	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-26 15:00:00	\N	\N	\N	aitokyo_yuto	\N	過去に返信あり	2025-08-26 15:00:00
766c7bea-487a-422f-8aa2-61b73fa6b6f1	武内あい	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-29 15:00:00	\N	\N	\N	ai.bi_face_salon115	\N	無料体験済み	2025-07-29 15:00:00
6bb0be92-7369-448e-bfc2-8468e0eeab0e	田中 励也	2025년 11월 10일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-26 15:00:00	\N	\N	\N	reiya.lond	\N	過去に返信あり	2025-10-26 15:00:00
ae5d0234-64ae-44d9-8857-5167e15de118	里﨑	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-04 15:00:00	\N	\N	\N	mnkstzk__00	\N	過去に返信あり	2025-06-04 15:00:00
b3b25b5b-c274-4f99-bb6f-a92f10efd0e4	田中 優奈	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-26 15:00:00	\N	\N	\N	mille_graces	\N	エンゲージ追加	2025-06-26 15:00:00
ebee15d9-fb66-46f3-bab6-aa6afb70f97a	堀 匠吾	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	horisho1026	\N	過去に返信あり	2025-09-24 15:00:00
89587bc2-3264-47b0-8c4e-a27509265c63	ARTCAFE CARANCARAN	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-17 15:00:00	\N	\N	\N	artcafecaran	\N	過去に返信あり	2025-08-17 15:00:00
febd311f-241c-42d6-aaa6-b3a7307500c4	大空	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-01 15:00:00	\N	\N	\N	hiro11sky	\N	過去に返信あり	2025-10-01 15:00:00
304cc5dd-0036-456f-a0f1-14b7f72942fb	大野 香奈	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-30 15:00:00	\N	\N	\N	koun_spa	\N	無料体験済み	2025-06-30 15:00:00
78d60619-9678-49fb-a526-79f7955d356d	和音	2025년 10월 30일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-15 15:00:00	\N	\N	\N	carta_kazune	\N	過去に返信あり	2025-10-15 15:00:00
7e2e2046-3da0-4391-928f-6519a00e44fc	ルア	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-03 15:00:00	\N	\N	\N	rua.nails__	\N	無料体験済み	2025-07-03 15:00:00
90bd30c5-a7d0-48e0-9f60-9e6a02ada740	あつし	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-05 15:00:00	\N	\N	\N	baba_atsushi___atwusyiiii	\N	無料体験済み	2025-10-05 15:00:00
81c79760-c9d2-417a-8f14-fc34a7bb2500	飯干 勇雅	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-27 15:00:00	\N	\N	\N	yuga_iiboshi	\N	無料体験済み	2025-10-27 15:00:00
9dd08755-3e33-42d5-976c-fb2cb7e0790b	西原珈琲店 本山本店	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-27 15:00:00	\N	\N	\N	nishihara_coffee	\N	過去に返信あり	2025-07-27 15:00:00
e03df213-ac04-45de-81be-2a77034418fc	りょーと	2025년 11월 05일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	ryoooooo.to	\N	無料体験済み	2025-10-22 15:00:00
49cced71-9c35-4add-86e7-48502e537515	野口 昴夢	2025년 11월 03일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-20 15:00:00	\N	\N	\N	akimu_senjyu	\N	過去に返信あり	2025-10-20 15:00:00
91c524fa-3da4-4f6c-817c-0a20ce247a34	佐藤 崇文	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-04 15:00:00	\N	\N	\N	satoh.0413	\N	過去に返信あり	2025-09-04 15:00:00
9ccb76e8-81eb-4590-b6d0-81fa509d4b2f	咲太	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	moti_koko_bikke	\N	過去に返信あり	2025-10-07 15:00:00
6a6df79e-796b-44c8-b252-d8fed13a633e	高井 伽恩	2025년 11월 11일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-27 15:00:00	\N	\N	\N	kanon.hair	\N	過去に返信あり	2025-10-27 15:00:00
538332a3-036a-415c-b907-1ad1237ff7d7	たろちゃんマルシェ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	tarochanmarche	\N	過去に返信あり	2025-07-24 15:00:00
2ea86e40-b611-4359-97e1-d27a133b393e	菅原 聖人	2025년 11월 10일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-26 15:00:00	\N	\N	\N	k.e.y_sugawara	\N	過去に返信あり	2025-10-26 15:00:00
221b27c4-ae2d-4f8f-867f-29b3b43c1603	FAROよこすかポートマーケット店	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	faroyokosuka	\N	過去に返信あり	2025-07-24 15:00:00
e57e820f-5a48-40c3-8819-1aabe8023911	ほぐし専門店give	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-18 15:00:00	\N	\N	\N	hogushi.give	\N	無料体験済み	2025-08-18 15:00:00
ee62cb82-7dc5-46b6-9d77-bce2708aa671	前島 輝俊	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-30 15:00:00	\N	\N	\N	teru.m0407	\N	過去に返信あり	2025-06-30 15:00:00
87390544-ec5a-4a0e-b946-2061640a3555	ニッシー	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-06 15:00:00	\N	\N	\N	furstinnissy_	\N	過去に返信あり	2025-07-06 15:00:00
4a23ca1b-0e38-44ba-9aee-f52b8ceb9caf	𝔸𝕂𝕀ℝ𝔸	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-05 15:00:00	\N	\N	\N	am.nail.lakia	\N	過去に返信あり	2025-08-05 15:00:00
c853fe1c-159d-4f11-984f-4072b32d8700	Kenta Fujisawa	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	unico.kenta_97	\N	過去に返信あり	2025-10-07 15:00:00
a3a9410f-c0a0-48ed-baf1-8e9cddac4ff6	大塚 勝也	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-16 15:00:00	\N	\N	\N	ludique_asakusa	\N	無料体験済み	2025-07-16 15:00:00
8551f090-a8bb-4382-bbc6-e46cc49ff770	ゆいかずき	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-13 15:00:00	\N	\N	\N	magico_yui	\N	過去に返信あり	2025-10-13 15:00:00
40220a7d-2db3-459d-bcb2-0f819aa0a697	松本 耕基	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	lmark_kouki	\N	過去に返信あり	2025-09-24 15:00:00
f2059e61-c2dd-406f-9495-f37645b763d3	小板橋 海斗	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	sign_kaito	\N	過去に返信あり	2025-09-24 15:00:00
aa7a4458-96c9-4aaf-b969-476020f43295	Amina Nakamura	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-31 15:00:00	\N	\N	\N	_apr_nail	\N	過去に返信あり	2025-07-31 15:00:00
78c2aaa4-2ed7-462f-8a80-cd512683f8c4	冨永 美波	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-11 15:00:00	\N	\N	\N	m_recipe1123	\N	無料体験済み	2025-09-11 15:00:00
8ca69252-e15e-4733-aa8b-220b3a10ee19	中出 健太	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	nakade_kenta	\N	過去に返信あり	2025-07-24 15:00:00
541a4cd5-8961-4d0d-b566-afe69fd1b0f0	菅原 里樹	2025년 11월 04일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-21 15:00:00	\N	\N	\N	riki_unami	\N	過去に返信あり	2025-09-21 15:00:00
f2ebdacf-b0b9-4a6e-a5fa-23f78c685c76	渡邊 優輝	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	yuki__perm	\N	過去に返信あり	2025-09-24 15:00:00
3f2d8103-15e7-4a92-8530-4f765651797a	松岡 拓実	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-13 15:00:00	\N	\N	\N	matsu_short	\N	過去に返信あり	2025-10-13 15:00:00
af0c9ba1-0d32-41a5-afa6-a5913cfffdaf	かつき ともこ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	sousaitepanhouzuki	\N	過去に契約	2025-10-07 15:00:00
000e84a3-928e-4cb2-a2ff-88f207cf7fd2	カタヤマ タツミ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-27 15:00:00	\N	\N	\N	i_am_.tatsu	\N	投稿上位露出	2025-10-27 15:00:00
8c345caf-f29c-48ed-ab50-cc4f1c665fb5	白川 史也	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-14 15:00:00	\N	\N	\N	fumiyamukun	\N	過去に返信あり	2025-10-14 15:00:00
ae0165ea-2a25-4bdc-a769-e1e314867266	須田 大貴	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-23 15:00:00	\N	\N	\N	hiro_s68	\N	過去に返信あり	2025-09-23 15:00:00
afeac9d0-b672-4bce-8916-f313836e0b49	比佐野大地	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	daichi_lwis	\N	無料体験済み	2025-09-24 15:00:00
94dba720-3ff1-4878-8b2a-88511100cdb4	リクトカワシマ	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-14 15:00:00	\N	\N	\N	hair_rikuto_color	\N	過去に返信あり	2025-10-14 15:00:00
85ddceab-2efc-4093-ab49-87fc2c17dd4b	大原 響	2025년 11월 06일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	hair_kyo	\N	過去に返信あり	2025-10-22 15:00:00
d3edf947-b1e5-4777-8a95-f75cc882117e	Reiji	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	reiji_.kwz	\N	無料体験済み	2025-10-28 15:00:00
d1add94e-84c3-451a-b52a-f5a4c556061d	元氣亭《自然食れすとらん》	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-08 15:00:00	\N	\N	\N	ecolo_genkitei	\N	過去に返信あり	2025-07-08 15:00:00
7321219f-5a06-44d2-9126-16d9b7f8704b	平松 巧希	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-27 15:00:00	\N	\N	\N	kouki.hiramatsu	\N	無料体験済み	2025-10-27 15:00:00
f28da3f3-dc5d-4e75-b014-ef04dc4d0aa5	五明 顕太	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-03 15:00:00	\N	\N	\N	kingking5340	\N	無料体験済み	2025-07-03 15:00:00
ef0120ad-c5a2-4ae2-aca4-9b9548b1f60d	やぐやkichijoji	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-06 15:00:00	\N	\N	\N	yaguya_kichijoji	\N	過去に返信あり	2025-08-06 15:00:00
a293b981-c523-47c3-954b-ebcc70cb852b	きょう	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-28 15:00:00	\N	\N	\N	kyo_moniqa	\N	過去に返信あり	2025-09-28 15:00:00
2affa7b8-73b3-4c79-8342-ea36e8299c27	福元 佑真	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-29 15:00:00	\N	\N	\N	diptych.yuuma	\N	過去に返信あり	2025-10-29 15:00:00
9ce0f31b-d95b-4888-8440-08491cf59c91	タテヤマシンタ	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-06 15:00:00	\N	\N	\N	tateyama_shinta	\N	過去に返信あり	2025-10-06 15:00:00
f68fd49a-38ac-426d-bcfe-fc3cc20d0f92	サリアクリニック	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-07 15:00:00	\N	\N	\N	sariaclinic	\N	過去に返信あり	2025-09-07 15:00:00
06cc8daa-8a17-4812-b3da-c74a0b54299b	Romi	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-13 15:00:00	\N	\N	\N	romi_baebae	\N	過去に返信あり	2025-10-13 15:00:00
365b5f18-6853-494e-a465-ef95d2602497	ミセスラクシタイ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-17 15:00:00	\N	\N	\N	mrs.rakushitai	\N	過去に返信あり	2025-08-17 15:00:00
fc081751-bc98-46a2-a81c-319ab0bb1b3a	小熊 笑	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	sho__tohka	\N	無料体験済み	2025-10-28 15:00:00
56780d38-1c83-4fc3-8be3-f0b0f50a0137	朴 叡勝（パク イエスン）	2025년 11월 06일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	yeseung_926	\N	過去に返信あり	2025-10-22 15:00:00
da51d47c-8665-4122-a2e5-8c4463fb8d48	渡辺 陸斗	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-28 15:00:00	\N	\N	\N	watanabe_r.1119	\N	過去に返信あり	2025-09-28 15:00:00
bd68ae90-7fd3-44ca-b66f-97a53f1be88c	堀井 隼	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-23 15:00:00	\N	\N	\N	horipon_frei	\N	過去に返信あり	2025-09-23 15:00:00
7c264ffc-f8bf-4c5d-a97b-5df67f15a8dd	くがれいじ	2025년 11월 04일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-21 15:00:00	\N	\N	\N	reizi_kuga	\N	過去に返信あり	2025-09-21 15:00:00
d44531b6-3510-4ebd-a269-f1315bf32b1d	AKIYA	2025년 10월 31일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-16 15:00:00	\N	\N	\N	akiya_nakane	\N	過去に返信あり	2025-10-16 15:00:00
56cfb8de-5efb-4095-a72b-1729b60fc585	真基	2025년 11월 11일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-27 15:00:00	\N	\N	\N	havana_masaki0423	\N	過去に返信あり	2025-10-27 15:00:00
0913aed8-df0f-4c51-b0d0-a54fdd8f0aaa	北村 隆太郎	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	ryu_album_	\N	無料体験済み	2025-10-07 15:00:00
981f6c5f-c7a7-4d84-b9f0-7ff982e78f93	畠中ケント	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-29 15:00:00	\N	\N	\N	hasami_kento	\N	過去に返信あり	2025-10-29 15:00:00
b811a626-608e-4b77-ad8a-c9ed7b41d14a	坂本 友有里	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-17 15:00:00	\N	\N	\N	piccolococo	\N	無料体験済み	2025-08-17 15:00:00
80926deb-013f-4721-bd11-c74255384d8f	REN	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-30 15:00:00	\N	\N	\N	ren_hairsignature	\N	過去に返信あり	2025-06-30 15:00:00
02ebd142-0097-49b5-bc62-5c8a854716ae	p.b.nail.haruka	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-26 15:00:00	\N	\N	\N	p.b.nail.haruka	\N	過去に返信あり	2025-08-26 15:00:00
3383799c-c231-433e-9543-0d6a67bb8533	長内 勇太	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	yuta.osanai	\N	過去に返信あり	2025-10-28 15:00:00
0e1f4552-fd96-45e3-aa80-e7b18bcb4a55	小松崎 祐太	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	komax1010	\N	過去に契約	2025-10-22 15:00:00
31416fc0-e709-4968-92a4-c748d4f3adf8	kasumi	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-30 15:00:00	\N	\N	\N	locanail___	\N	無料体験済み	2025-06-30 15:00:00
db9eda62-a203-43a6-86e3-c7a100e631a4	kenya	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	kenya_kawakubo	\N	過去に返信あり	2025-10-28 15:00:00
624d9551-de37-4952-b3eb-f65a63b67fc9	藤野 樹	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-05 15:00:00	\N	\N	\N	fujino_129	\N	過去に返信あり	2025-10-05 15:00:00
31a3f9e4-ddf7-475b-8da1-6fa1ca11a8e4	山藤 和希	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-21 15:00:00	\N	\N	\N	lipps_santoukazuki	\N	過去に返信あり	2025-09-21 15:00:00
06cfdbce-f326-461b-9f7f-37921c9fdf94	河嶋  峻介	2025년 11월 12일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	shu.n0821	\N	過去に返信あり	2025-10-28 15:00:00
8f265a86-7eec-4c6f-ac16-63a41305867f	川合 健斗	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	kento_sunnyside	\N	過去に返信あり	2025-10-28 15:00:00
ab00e2d5-561e-40a8-a9d9-98d1f6b74c5b	iato	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	iato_24_	\N	過去に返信あり	2025-09-24 15:00:00
2718ce78-112b-45a5-b421-5b3d8d5aab86	渡邉 清貴	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	k1y0tk	\N	過去に返信あり	2025-10-28 15:00:00
998073ab-c0cd-4f6d-80aa-4aaf66eca1ca	杉浦	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-07-07 15:00:00	\N	アウトDM	\N	ss_art0103	\N	過去に返信あり	2025-07-07 15:00:00
f85c839c-078b-4f8c-aaf3-578744ca5e1c	美空 大阪アートメイク	アートメイク		090-0000-0000	\N	\N	山﨑水優	\N	開始	2025-08-31 15:00:00	\N	\N	\N	miku_artmake_	\N	\N	2025-08-31 15:00:00
9961c257-8040-4098-abc2-2d3b242a3ab7	小鴨 流詩音	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	rk_x10x	\N	過去に返信あり	2025-09-24 15:00:00
2e68a992-e442-4b06-b152-03838d328f63	三茶まれ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-03 15:00:00	\N	\N	\N	sanchamare	\N	無料体験済み	2025-08-03 15:00:00
29f8ab75-ae93-4c5e-aa10-7499da84e381	庭野 匠真	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-20 15:00:00	\N	\N	\N	shomaniwano	\N	過去に返信あり	2025-10-20 15:00:00
28cce758-3ab3-4c33-96da-586637026d22	田畑 善二郎	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-28 15:00:00	\N	\N	\N	zenjiro_jurk	\N	無料体験済み	2025-08-28 15:00:00
1ba069f3-eda2-4448-b963-8a2c5efdf235	信岡 凌成	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-17 15:00:00	\N	\N	\N	sic_nr_	\N	無料体験済み	2025-09-17 15:00:00
0cca5d01-0673-44f5-be06-39e0a3f150b1	深夜食堂ねむけまなこ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-17 15:00:00	\N	\N	\N	shinyasyokudou_nemukemanako	\N	過去に返信あり	2025-07-17 15:00:00
5168c0b5-ad80-4433-a7f7-1a737eefbab0	WADA MASAKI	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	wady_masaki	\N	過去に返信あり	2025-09-24 15:00:00
3bc605b5-2686-4d3e-8b0d-a5a4a033ce85	長島 光希	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-07 15:00:00	\N	\N	\N	kokinhair	\N	過去に返信あり	2025-07-07 15:00:00
56939b62-bcfb-449a-8116-3cc71c4a38bf	中山翔	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-13 15:00:00	\N	\N	\N	kakeru_andstyle	\N	過去に返信あり	2025-10-13 15:00:00
3e2dd2ee-6421-43ac-bfad-5df29cc3491d	まさ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-18 15:00:00	\N	\N	\N	she2_masa	\N	無料体験済み	2025-08-18 15:00:00
51c0d5b9-5476-4e95-9d22-346f79f09693	ラーメン・つけめん　藤虎｜名古屋ラーメン	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-18 15:00:00	\N	\N	\N	ramen.fujitora	\N	過去に返信あり	2025-09-18 15:00:00
e005e6c4-75d1-47b7-bf2b-1398b117f049	AYATO	2025년 11월 03일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-20 15:00:00	\N	\N	\N	ayato_____naka	\N	過去に返信あり	2025-10-20 15:00:00
23ce5303-4115-45d1-ab14-f98627ba0ab0	ikiRu	2025년 11월 13일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-29 15:00:00	\N	\N	\N	ikiru_16	\N	無料体験済み	2025-10-29 15:00:00
3fe81ef6-25f2-45e7-ab77-556d2200d99c	Nail house Charmy	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-31 15:00:00	\N	\N	\N	nailhouse_charmy	\N	過去に返信あり	2025-07-31 15:00:00
c0a9a361-3d25-429b-ae5a-9bfade47ff6b	HIBIKI	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-07 15:00:00	\N	\N	\N	yiye_hibiki	\N	無料体験済み	2025-09-07 15:00:00
6e363eea-2b43-48b1-a86d-9fbdf5a1a868	南 一成	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-07 15:00:00	\N	\N	\N	album_issei	\N	過去に返信あり	2025-10-07 15:00:00
fd515493-bc5d-4709-b29f-37752dc24718	yui	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-17 15:00:00	\N	\N	\N	_ydoll_	\N	無料体験済み	2025-06-17 15:00:00
896fd36f-b737-4c42-ae43-366d62e44c9b	マチ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-27 15:00:00	\N	\N	\N	machi.hair_	\N	過去に返信あり	2025-07-27 15:00:00
0c951bf0-3f7c-4928-ad6f-34af3208c6f1	osanai masato	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	osanai_masato	\N	過去に返信あり	2025-10-28 15:00:00
175013c1-a9a9-4de8-836c-d4aa1a280a5c	ちひろ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-27 15:00:00	\N	\N	\N	_chihiro_ego_	\N	過去に返信あり	2025-07-27 15:00:00
e9403016-d19d-4186-a302-37c42cb0118f	大槻 勇樹	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	y.o_82	\N	過去に返信あり	2025-07-24 15:00:00
36cfea1d-634c-46d8-8e7a-2fcfd0427a40	obakan	2025년 10월 30일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-15 15:00:00	\N	\N	\N	obakan_hair_lond	\N	過去に返信あり	2025-10-15 15:00:00
59c88cbc-8194-404a-b0b2-6d893b85244d	ミズサワ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-07 15:00:00	\N	\N	\N	kickjoyfitness	\N	無料体験済み	2025-09-07 15:00:00
0e9ac054-2929-4049-932c-f7cac11fea56	maho	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-02 15:00:00	\N	\N	\N	maho_osakana	\N	過去に返信あり	2025-06-02 15:00:00
d46a2c8d-647b-4022-b61e-babbcbfffbb0	食堂カフェ　金魚堂	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	shokudo_cafe_kingyodo	\N	過去に返信あり	2025-07-24 15:00:00
fa71c97d-e412-41f4-96e2-4c98b78976af	田中 聖也	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-31 15:00:00	\N	\N	\N	seiyast	\N	過去に返信あり	2025-08-31 15:00:00
23372d03-cbfd-49bd-86f4-966b3a3c3125	渡邊 靖洋	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-13 15:00:00	\N	\N	\N	yasu_tsunagu	\N	過去に返信あり	2025-10-13 15:00:00
53a45b93-efab-4119-8b62-04277f61c455	ピッチャーサワー	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-15 15:00:00	\N	\N	\N	pitchersour.jiyugaoka	\N	過去に返信あり	2025-07-15 15:00:00
5532e307-56bb-4364-a1c9-5540355e99d0	李奈	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-08-06 15:00:00	\N	\N	\N	private_nail_salon_dianail	\N	過去に返信あり	2025-08-06 15:00:00
1b2b15ff-d2aa-41bc-ad21-cd5c2b2a3a2a	炭火焼肉 食道園【公式】	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-17 15:00:00	\N	\N	\N	sumibiyakiniku_shokudouen	\N	過去に返信あり	2025-07-17 15:00:00
755cc59d-8b8f-430f-957c-6567b93e1b8a	高野 恭佑	2025년 11월 04일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-21 15:00:00	\N	\N	\N	takanox.10	\N	過去に返信あり	2025-10-21 15:00:00
42a99eeb-e406-4d1d-b708-c9f7d4a91e7c	高橋 龍哉	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-30 15:00:00	\N	\N	\N	ryuya_hair	\N	過去に返信あり	2025-09-30 15:00:00
5654209b-9927-4a0f-9cae-522b3fa599fc	渡邉清貴	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-28 15:00:00	\N	\N	\N	k1y0tk	\N	過去に返信あり	2025-10-28 15:00:00
773e14df-6f36-4cea-918a-392a214e7141	寺増 智幸	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-28 15:00:00	\N	\N	\N	lewin.trms0516	\N	過去に返信あり	2025-09-28 15:00:00
cf704de8-71bb-41a2-8515-fb27a6f56306	森山 涼介	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-02 15:00:00	\N	\N	\N	issue_moriyama	\N	過去に返信あり	2025-10-02 15:00:00
43e0a7a0-0ef9-45c5-9fd9-451b9993ae38	すしやコトブキ蒲田店	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-24 15:00:00	\N	\N	\N	kotobuki_kamata	\N	過去に返信あり	2025-07-24 15:00:00
3ac3393f-7bdd-480e-90ef-fa85d3bbb5ed	ゆみ	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-02 15:00:00	\N	\N	\N	noge_wakaba	\N	無料体験済み	2025-07-02 15:00:00
046a3632-ca6b-44c5-80a5-264685f30f95	九嶋 優斗	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-16 15:00:00	\N	\N	\N	miyus_yuto	\N	無料体験済み	2025-10-16 15:00:00
5d42b40b-2744-49af-9422-c0cd30c3e644	服部 タカノリ	2025년 11월 06일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-22 15:00:00	\N	\N	\N	jewil_hattori	\N	過去に返信あり	2025-10-22 15:00:00
03f7a83e-afa6-4894-b6fe-318707305dc8	元橋 啓太	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-14 15:00:00	\N	\N	\N	ruku_motohashi1209	\N	エンゲージ追加	2025-10-16 15:00:00
a94c22d6-357e-4699-b3f0-626c00c3729a	Calmer & Be.	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-22 15:00:00	\N	\N	\N	calmer.and.be0724	\N	過去に返信あり	2025-10-22 15:00:00
62de0645-5ab6-47a9-85fb-64132b1245c3	Ripple	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-27 15:00:00	\N	\N	\N	ripple_spreading	\N	過去に返信あり	2025-10-27 15:00:00
2c6f0820-c685-4362-b67b-d9d59593ae24	ジャザサイズスタジオ高崎金古	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-28 15:00:00	\N	\N	\N	jazzercise_takasaki_kaneko	\N	過去に返信あり	2025-10-28 15:00:00
6fb0ee6d-97c5-4fcb-969f-cb708e25e8b0	サロンフォルス上村（うえむら）さん	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-27 15:00:00	\N	\N	\N	salonforce5005	\N	過去に返信あり	2025-10-27 15:00:00
ab5aba83-a672-4a62-9cc3-2f6917779883	GYM大興奮	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-15 15:00:00	\N	\N	\N	gymdaikoufun	\N	過去に返信あり	2025-10-15 15:00:00
8329eaaf-6e36-4022-890b-19c05ef35c77	辛島勇也	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-05-25 15:00:00	\N	\N	\N	yakitori.naha	\N	休眠顧客	2025-05-25 15:00:00
fc59e854-e524-45d5-947e-6258c3b406c7	西島健二	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-05-12 15:00:00	\N	\N	\N	naturalbody.yokohama	\N	休眠顧客	2025-05-12 15:00:00
b9a5cb7c-8e59-4eeb-9c6a-4561d781ce13	緒方武蔵	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-09-13 15:00:00	\N	\N	\N	musashi_ruffcutters	\N	休眠顧客	2025-09-13 15:00:00
8f3db730-cb71-4b27-8a0b-1522ef190f2b	しょっちー	\N		090-0000-0000	\N	\N	石黒杏奈	\N	開始	2025-10-27 15:00:00	\N	\N	\N	sisei.onesfit	\N	過去に返信あり	2025-10-27 15:00:00
05978123-ea06-4a10-80de-54e082645dfb	輝来	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-29 15:00:00	\N	\N	\N	teruku_hair	\N	過去に返信あり	2025-10-29 15:00:00
7c394117-f49d-4a9d-bc0b-70c1ac267a8c	ゆみまる	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-26 15:00:00	\N	\N	\N	yumimaru_maru	\N	過去に返信あり	2025-10-26 15:00:00
3c7843bb-9db2-49df-983b-50540b205bd3	a o i	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-06-04 15:00:00	\N	\N	\N	iam_aoi__	\N	過去に返信あり	2025-06-04 15:00:00
feebe920-24ac-4d30-8baf-775de434c712	池田 宜史	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-10-06 15:00:00	\N	\N	\N	avance_ikeda	\N	過去に返信あり	2025-10-06 15:00:00
69a26d30-1a36-4722-b56c-02439887815a	石川 晃大	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-08 15:00:00	\N	\N	\N	iskwkut_0512	\N	過去に返信あり	2025-07-08 15:00:00
23cd4145-ca5a-4cb8-844f-00acaed1c7fc	http://alma.de/ Churrasco	\N		090-0000-0000	\N	\N	山下南	\N	開始	2025-07-27 15:00:00	\N	\N	\N	alma.dechurrasco	\N	過去に返信あり	2025-07-27 15:00:00
5da45674-6b4c-4c4b-9d28-d7709b036aab	rento	2025년 10월 29일		090-0000-0000	\N	\N	山下南	\N	開始	2025-09-24 15:00:00	\N	\N	\N	rento__mkw	\N	過去に返信あり	2025-09-24 15:00:00
\.


--
-- Data for Name: retargeting_history; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.retargeting_history (id, retargeting_customer_id, user_id, user_name, type, content, created_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.sales (id, customer_id, user_id, sales_type, source_type, amount, contract_date, note, created_at, company_name, marketing_content) FROM stdin;
3e8a160c-d582-46a4-9410-e7cf83dd96dc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	81818	2024-06-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
6ee5cf5b-17ae-4da6-8f14-a5fb7b1bd613	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	95454	2024-06-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
1d7a9883-7ff7-47f0-ad1a-a4187b6bee6a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	29090	2024-06-22	\N	2025-10-31 14:13:07.379688	epi	\N
ff60c795-d042-46c0-a078-8a2593229271	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	54545	2024-06-29	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
c03a3075-fc55-423a-b29b-54b51379d412	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	81818	2024-06-06	\N	2025-10-31 14:13:07.379688	merci 石本 良太	\N
523166ee-e16f-4447-86cc-665b2077a30e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1181	2024-06-20	\N	2025-10-31 14:13:07.379688	桃花	\N
6e718088-374d-4fbf-83a6-7ff5ace51139	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	90909	2024-06-28	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
b446bac8-3908-439c-b3e2-29de1abcfe67	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	109090	2024-07-27	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
7ec2a027-f633-47e5-aa92-c6d60b125b0c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	95454	2024-07-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
9ef2f91d-a8f5-47ef-894c-4114052ff91b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	95454	2024-08-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
c2a84b59-0902-438c-ab57-6eb7b0eadc04	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	29090	2024-08-22	\N	2025-10-31 14:13:07.379688	epi	\N
a6b1dedb-5110-41c6-881a-ee788a512928	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	109090	2024-08-04	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
ca3870bc-4ed8-484c-8f67-70450e928d68	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	90909	2024-08-01	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
d8cf80a0-9810-4b84-8430-12b26ef85436	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	154545	2024-08-02	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
2eb028e3-5132-4062-a94f-c03a499dd949	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	81818	2024-08-05	\N	2025-10-31 14:13:07.379688	merci 石本 良太	\N
31d52332-8ddb-44a6-9656-4f70461b4c44	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	63636	2024-08-20	\N	2025-10-31 14:13:07.379688	Unknown_17	\N
5260289c-498e-48ab-b21d-2301e7923c48	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	90909	2024-08-20	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
24d15e75-a77b-4e0b-a40d-456728970a5a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	136363	2024-08-20	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
c8153c32-ebd0-4b70-84d2-3e48bb25bc60	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	12272	2024-08-01	\N	2025-10-31 14:13:07.379688	伊藤由真	\N
9a478d37-471d-4752-9478-f436de45848f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	154545	2024-08-20	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
ff9687cf-2d69-46d9-bf99-9ccd39149e46	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	31818	2024-08-07	\N	2025-10-31 14:13:07.379688	Unknown_22	\N
283b273e-4145-411d-a073-8e57d2991280	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	9090	2024-08-07	\N	2025-10-31 14:13:07.379688	Sun Tribe miyakojima	\N
e5112c41-a382-4826-9766-ddec240ac703	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	106363	2024-08-14	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
0f5da4f3-0734-4e98-8a09-a8d890e193c0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	95454	2024-09-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
95d32eb4-421e-4ff8-a404-92e55a7e0733	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	29090	2024-09-22	\N	2025-10-31 14:13:07.379688	epi	\N
c3ecab7f-f5f6-4c6c-8187-e1a0224b5d0f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	90909	2024-09-04	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
cca19612-bdef-4b2a-932a-13fa2fd7b4f2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	63636	2024-09-20	\N	2025-10-31 14:13:07.379688	Unknown_28	\N
b65ee07d-21af-4bd0-9854-59b2494a17bf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	154545	2024-09-23	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
332db66c-3197-41c9-adf3-1421aca4030e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	113636	2024-09-06	\N	2025-10-31 14:13:07.379688	清水 政隆	\N
4ea0f9df-d498-468a-a89c-6918152df175	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	106363	2024-09-09	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
f7b4c77e-1cc9-44b6-b200-b5ec927e8914	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	101818	2024-09-09	\N	2025-10-31 14:13:07.379688	Unknown_32	\N
4f080a67-87fe-42a4-8f8d-c2e5a109301a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	136363	2024-09-09	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
a08e9c69-dec7-4e39-ab2e-dcc5c93c10e4	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-09-28	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
9d97fcf7-39d5-4b74-8448-2f5661ad3d1e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	27272	2024-09-09	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
c1620f5d-fa3e-4e63-b4b2-c8cd878d6648	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	109090	2024-09-23	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
9c0e6e85-6723-420e-9379-61098215e093	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	13636	2024-09-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
8783bdf1-83bc-4d16-9f8e-705f40ca48ac	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	57272	2024-09-19	\N	2025-10-31 14:13:07.379688	MB Medical Artmake	\N
b99ebbe6-81cb-460d-afdc-d185a4ad8049	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	2363	2024-09-20	\N	2025-10-31 14:13:07.379688	株式会社P.C.G	\N
8fd6d270-9f5d-459c-b0d0-47b69553726b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	11818	2024-09-20	\N	2025-10-31 14:13:07.379688	KIRENAL	\N
975a6ffd-daa5-4637-bcfe-58f77eeb5c54	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	227272	2024-09-23	\N	2025-10-31 14:13:07.379688	國分大輔	\N
1be2d157-b997-4309-9e48-f45b5b8b3b1b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	18181	2024-09-25	\N	2025-10-31 14:13:07.379688	松倉陸	\N
81134989-9446-4fd8-9aa5-6a59ba62696b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	27272	2024-09-30	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
4beee2d4-2c91-441c-a21c-03003462469d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	136363	2024-09-27	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
e4aa6e87-5166-4854-864c-57a2dd208481	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2024-10-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
ee48de02-d049-49a5-a649-9eec7c334b1f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	32000	2024-10-21	\N	2025-10-31 14:13:07.379688	epi	\N
30135d65-be58-4c5d-8903-6949bc693c41	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-10-08	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
da06eeb9-b4fa-4308-ae27-d7e3871a984e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2024-10-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
6973dab8-c51f-421f-8af7-f98a3760ff92	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-10-02	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
09424dea-a5bf-43d3-9e97-d113a905c3a1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	170000	2024-10-02	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
17bbfd07-cd29-4c6c-9710-bdb5e09c1109	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-10-25	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
1806d25c-5a91-4633-a033-cad763f3cc5c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	113636	2024-10-07	\N	2025-10-31 14:13:07.379688	清水 政隆	\N
2d63e8e0-5573-43e1-af18-67ec59571d6a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	106363	2024-10-10	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
44300200-5968-4484-8af5-e3f7e80c02bc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	101818	2024-10-10	\N	2025-10-31 14:13:07.379688	Unknown_54	\N
3076458e-7fff-4f8f-80ca-b08ad605e536	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	45454	2024-10-10	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
350ef996-23fb-414d-a62e-591d74b0962e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2024-10-30	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
11c0f8a6-a88f-41d1-ac65-e7fd11c587b1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-10-14	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
8743caf4-b344-4ffb-8a88-d222b9bcc40d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	118181	2024-10-04	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
5bdebe06-02af-4717-b075-482da7c16e76	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	18181	2024-10-01	\N	2025-10-31 14:13:07.379688	渡部幸司	\N
a6dde8d0-c39c-43ec-aead-e4b97819bffd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-10-23	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
f5643199-eddf-41c5-afa3-187b7d788d88	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2024-10-10	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
a7ac3c1c-a4f2-4c9e-a45e-c2e2a1b1a767	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2024-10-10	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
767dee6e-da00-4654-a6ab-60a5325996c9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10000	2024-10-09	\N	2025-10-31 14:13:07.379688	亀山友佳	\N
cc8033e5-153f-4c04-9c48-9426de6fad7e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	400000	2024-10-18	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
e3fdf644-2398-402c-a025-40a065b648bb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	11700	2024-10-25	\N	2025-10-31 14:13:07.379688	Unknown_65	\N
75a7f10e-88d4-4136-9148-81ce9499db64	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	63636	2024-10-25	\N	2025-10-31 14:13:07.379688	株式会社OTTOGIマシジョア	\N
f3ec5e04-edd7-4243-a8e2-19c2f56ab163	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	54545	2024-10-28	\N	2025-10-31 14:13:07.379688	星野翔太	\N
1303d479-2c85-4c05-8817-cc11f30f9f36	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2024-11-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
9119329f-e482-4ba4-91e9-ac61cc916e45	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	32000	2024-11-22	\N	2025-10-31 14:13:07.379688	epi	\N
40312296-be38-4ce4-b41e-890e43775cfc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2024-11-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
c3ca0f2e-32c3-4c6f-8d82-6e40170bb726	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-11-05	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
3d141bfc-42e4-49ca-af03-59e986618b0a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-11-13	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
bdd6660f-8794-43da-9056-f9680f8a2e46	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-11-13	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
fd812940-099e-418d-9971-773f9201cd46	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	106363	2024-11-12	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
5c34c834-25f8-4c25-9fb9-f500bfa73179	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	101818	2024-11-12	\N	2025-10-31 14:13:07.379688	Unknown_75	\N
620fe72c-7f81-48a0-a88c-b2ad5ef94b01	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2024-11-12	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
59be4102-8f09-4955-b5af-a05ccdaf7c51	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	20000	2024-11-08	\N	2025-10-31 14:13:07.379688	松倉陸	\N
e1baf5a1-4ed2-4af8-aebf-3ac66a650962	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	70000	2024-11-05	\N	2025-10-31 14:13:07.379688	Unknown_78	\N
e39f64d0-b5c6-4858-a85c-ab558822ef7d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	330000	2024-11-14	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
9273499f-97ec-4838-8158-7fd296824c39	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-11-14	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
a1ad2e7f-3dd7-4058-a5a3-dad7ecdc2c2d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2024-11-12	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
b07f81cc-5cc5-4a51-bb5f-306e46ccd7be	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-11-13	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
38bc9822-9c0e-445d-8e74-b2dbb3ba866d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-12-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
aaffdaa6-c98a-436b-bdea-c0166d7d2380	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2024-12-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
9fb55e5c-7fc1-44b1-aee5-7efcf1d2be2d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	15000	2024-10-15	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
49e58399-2b25-42fc-b005-2a567e78d28d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	60000	2024-10-23	\N	2025-10-31 14:13:07.379688	株式会社efub	\N
fd282b52-cb79-4391-b989-72af6cd09603	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-10-30	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
7b9236f5-8007-427b-b300-88246ac5355e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	81818	2024-05-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
fdd63d7a-4bcb-4bae-9c57-c497427fa573	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	95454	2024-05-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
3da02846-06be-4f32-a761-cf270aaf152d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	36363	2024-05-22	\N	2025-10-31 14:13:07.379688	epi	\N
14ee6a77-ceb1-446d-8853-de12d7835399	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	54545	2024-05-29	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
4e93105c-3a7a-4d08-a5a9-4ec73073c0fe	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2024-12-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
04cfaee7-1cd9-4c8a-9312-ab7b0af5598a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2024-12-24	\N	2025-10-31 14:13:07.379688	epi	\N
810929f8-b888-4af1-8b2a-6eae87285f5c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-12-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
561eaf8a-24da-4846-9847-3245b96eaaf7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	11000	2024-12-02	\N	2025-10-31 14:13:07.379688	今井佑宥	\N
80c7283b-cdb7-40ef-aee8-4d1775da25b5	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	20000	2024-12-05	\N	2025-10-31 14:13:07.379688	Unknown_96	\N
7cc8b722-8f15-41d9-80f6-620193f7fe46	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-01-30	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
6c5bd916-236e-4386-aa7f-bc8efa2733f7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-01-30	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
493aa8d7-6718-4677-84f1-08c2577c62fd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2024-12-13	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
450991ee-beab-4413-afb3-033ebc31d597	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-12-06	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
2d9763bd-c7a5-4c8f-8f4f-7e9a6957ddcd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	106363	2024-12-16	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
05606ccd-397c-4921-b7c4-16699b5fded3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	101818	2024-12-16	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
33a9f644-99d9-4065-9dd7-49b858e58573	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-01-23	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
8c48610b-457e-424f-8a2e-17dae794122f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2024-12-16	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
cebfaf8a-0f8a-4830-afd5-4eeb8f565764	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10000	2024-12-09	\N	2025-10-31 14:13:07.379688	亀山友佳	\N
fba2854b-07ab-4f31-85bb-cc09fd1bcb56	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2024-12-13	\N	2025-10-31 14:13:07.379688	browtique	\N
eec1064a-3c69-4e1a-94ef-8a76b2cea1df	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-03-24	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
5a50fd07-4369-43b7-8fe9-a93d6ba5786f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2024-12-20	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
19a5e802-a7e4-44f5-9824-8a46b9b06edd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	330000	2024-12-26	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
7bef2c16-e2b5-4fed-bbe8-a0eb591f4e74	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-12-14	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
a5bfebbf-049a-42ee-99bb-ee55abb5d7c7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	10000	2024-12-17	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
119b0cd3-7343-46e0-87d1-f12a58ba0600	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-12-25	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
cfa405fe-4fd8-41b8-8cb3-2e343ba6c5db	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	150000	2024-12-27	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
8ecf0882-fe6e-46d1-99ab-8ed017fcbca5	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2024-12-31	\N	2025-10-31 14:13:07.379688	Unknown_114	\N
bdf1cf99-c2c2-4259-b7a6-dcb2bfe6c838	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	2500	2024-12-26	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
5d299a26-d7cc-46a5-9a1c-459dac19495a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	2500	2024-12-16	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
88180b13-ede4-43e9-9da8-294458cb93d1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	70000	2024-12-25	\N	2025-10-31 14:13:07.379688	村上翼	\N
e22d80d0-8b60-4944-808b-6dc127d90380	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10500	2024-12-16	\N	2025-10-31 14:13:07.379688	YUMI	\N
9b85a4df-2fa9-4573-acf7-6bc19e7ddd1f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2025-01-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
354aa441-bb58-4e18-998b-2f5dc4ce2ccd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-01-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
df6ce03b-b030-4be1-bf15-a10a943021a5	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-01-24	\N	2025-10-31 14:13:07.379688	epi	\N
d4896ed8-0651-4a7e-99a6-82180600c839	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-01-08	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
1568a291-24e6-4303-9390-00f5c28f50e9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-01-14	\N	2025-10-31 14:13:07.379688	browtique	\N
d68c89c4-834d-4537-b97f-9732d1677e2a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-01-14	\N	2025-10-31 14:13:07.379688	browtique	\N
6284bc37-72b9-4b5f-990a-413a2f9464a9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	106364	2025-01-23	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
f4b31fc6-0d61-49ab-8417-16d99348e39e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	101818	2025-01-23	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
ab1461da-3276-4b92-a27b-1d5ef24eea51	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2024-12-16	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
fedfdbe5-94e6-458b-a3ab-a02496a7db2c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2025-01-10	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
be8b1118-2ee5-4ae8-88fc-ae837bff1ad9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	448485	2025-01-10	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
bda144ec-9eb3-4200-bd1a-b2086effc97c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	90000	2025-01-15	\N	2025-10-31 14:13:07.379688	伊藤由真	\N
d597fd50-f4e6-4e7d-9b95-61bfecf33e71	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	100000	2025-01-21	\N	2025-10-31 14:13:07.379688	UcanB美容外科・皮膚科	\N
41bfc04d-8c23-4349-a0a7-58b89b30fb7b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	5000	2025-01-09	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
bd96f9de-913b-4bc9-bcfe-90c4c98d9680	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-12-13	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
b2fc0265-4b07-4550-8c9a-062e591a351d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	485000	2025-03-31	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
9e9dd93f-deb9-4489-a8b2-5a3c66852958	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-01-31	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
32587740-0713-4090-a372-73d9786f2570	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-01-27	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
791b5632-acff-467b-8a4a-4f1bf336ef2e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	330000	2025-01-27	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
40ef4df9-a016-41bc-a5a3-db1fb0b893a8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2025-01-31	\N	2025-10-31 14:13:07.379688	Unknown_138	\N
1957e5e8-c572-4a5e-bec0-dd80a341cd05	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-12-13	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
e844a3db-012e-4364-b88c-047a185cc4c8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-12-13	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
188db7ac-c9be-40b9-bdb1-2066d4deaf51	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-01-21	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
5a666675-2ad7-43f7-a210-179ca22c2d51	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	2500	2025-01-30	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
f809abd0-c518-4a0b-9c1b-6dfa40dadf0e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2025-02-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
e610b3f1-c41d-4f19-96ab-8368f35ebace	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-02-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
fd499c55-26fd-4bfc-9a6b-583fdf781775	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-02-24	\N	2025-10-31 14:13:07.379688	epi	\N
a403f279-dde4-4cac-b71f-c83991a57f72	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	3000	2025-02-03	\N	2025-10-31 14:13:07.379688	YUMI	\N
a49ef003-27dd-46ae-8e11-731999ebe8a9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	67000	2025-02-06	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
04615923-5711-4995-aad8-9555ba05e548	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-02-10	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
539c662f-dbf0-4fa1-819a-c0230bcae7d2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	75000	2025-02-10	\N	2025-10-31 14:13:07.379688	村上翼	\N
581af4dc-e730-4d1c-b238-4be1ca32edd7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	130000	2025-02-07	\N	2025-10-31 14:13:07.379688	browtique	\N
c82da1e9-979e-4172-90d1-2710b018559c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-02-12	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
a56db668-d718-4d5c-a888-b28eb4be4d11	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	35000	2025-02-12	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
59a41ed4-2322-4877-a856-e9030ff3620b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	5000	2025-02-12	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
4cef6163-2322-4538-8e76-6a693e927cbc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	70000	2025-02-14	\N	2025-10-31 14:13:07.379688	Unknown_154	\N
b6312375-47e2-417a-93e3-b3c82c4f1826	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-01-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
e97e78e4-cbbf-495e-b6f2-c7296b20a273	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	448485	2025-02-25	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
a19396ff-c09b-41e8-a8c1-f5c6ce3161f7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	485000	2025-04-24	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
9fabbcd6-4ada-47ec-8fcc-1483a4c74137	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-03-18	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
5a1d8520-5abe-4898-907e-53c6b34485eb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	70000	2025-02-28	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
f8f6076c-d10c-4184-8b7f-ef2fd532aacf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	370000	2025-02-28	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
74e29b4e-b953-4de3-9c05-5e678e2d0d07	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-02-28	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
a3fed642-17d1-4aba-99f4-b2027d8770bb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	480000	2025-02-28	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
1b54b4f1-ea79-4869-a35b-dc2362223c44	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2025-02-28	\N	2025-10-31 14:13:07.379688	Unknown_163	\N
fce110bc-8178-4585-a16b-4e68614e1ed1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2025-03-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
b98de446-e24b-4e7d-87ef-c6674b23b1d2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-03-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
92c3c3fa-d217-4e48-b82e-b8ada7051795	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-03-24	\N	2025-10-31 14:13:07.379688	epi	\N
a955f750-b06c-4817-bfe6-10681cbe163a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	150000	2025-03-01	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
e012ee4d-eb97-4e4a-b5f1-363e39a1c105	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	9300	2025-03-05	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
cacf99b1-5cb0-4162-8179-cee377cb71eb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-03-05	\N	2025-10-31 14:13:07.379688	Unknown_169	\N
6a4df18a-e3df-4db8-8587-dd11e447333b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2025-03-07	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
98d14fa0-0658-4a30-8a03-b7575f08ded1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-03-10	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
dfa25435-e5a2-49dd-9f07-d8bcf46fbe16	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-04-18	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
93774f7f-ac99-4038-a892-7c4a10d808d8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	75000	2025-03-10	\N	2025-10-31 14:13:07.379688	村上翼	\N
20b6f6e0-4d13-4124-a258-3a76176edd7a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	140000	2025-03-17	\N	2025-10-31 14:13:07.379688	Unknown_174	\N
e56e252c-e07d-49cf-a88a-5d7fe19a3893	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2025-03-17	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
ec7a80ac-2c7c-47ac-8103-4ad234bbe417	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1000	2025-03-18	\N	2025-10-31 14:13:07.379688	ユミ	\N
ac7bec9f-bb51-464c-ba26-81dada39e610	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	200	2025-03-19	\N	2025-10-31 14:13:07.379688	ユミ	\N
a2d3f3bb-1118-473b-9191-c64ad9a20164	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-02-19	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
a690e857-a0e5-42cf-a118-0b3580d14e7e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	9000	2025-03-25	\N	2025-10-31 14:13:07.379688	吉田淳一	\N
e9e603d9-7cad-47bd-9f79-845ead41bf19	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	5000	2025-03-26	\N	2025-10-31 14:13:07.379688	増田栄里	\N
fb8c63b0-08e0-456d-8aa3-836a66625f2b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	1000	2025-03-27	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
78f43500-e391-4b72-9c79-9afd9dbc9e08	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-03-28	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
59aa4a4b-5926-4beb-bb92-b3a819951891	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	448485	2025-03-28	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
882e068d-eb85-4a20-a7e9-c1a3e971d247	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-03-31	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
0820d2c8-fdec-4fb5-abc9-bc9044611163	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2025-03-31	\N	2025-10-31 14:13:07.379688	Unknown_185	\N
df0cb21e-5d27-4fb9-93aa-14576d757973	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	35000	2025-03-31	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
2c67223d-5adb-4aa2-a3a6-33f0764cfb8f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	100800	2025-04-01	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
df4cfa00-7f97-41cd-b437-50138b20f7ce	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	5000	2025-04-04	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
0a22d82b-0a65-4f6e-ae5a-56ce4399331a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	80000	2025-04-04	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
d2387cc6-560c-4776-83f8-5000ee89a213	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	7500	2025-04-07	\N	2025-10-31 14:13:07.379688	YUMI	\N
e447964a-1264-4b23-b38a-866923e3f4ef	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	500	2025-04-09	\N	2025-10-31 14:13:07.379688	YUMI	\N
bcd2922b-dc4f-4392-9a8a-66f1f0f664cd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	35000	2025-04-08	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
3d46bc45-d9ca-46ce-81c3-5986adf000c7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-04-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
9dc38aa6-a917-4d5e-a12d-54e6ef761b06	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	15000	2025-04-09	\N	2025-10-31 14:13:07.379688	株式会社ALLURE	\N
38464d10-8fc7-4c23-a6d8-5b98beb0b5a2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	4000	2025-04-14	\N	2025-10-31 14:13:07.379688	上濱理奈	\N
fe4b84b2-80a3-48b1-92a8-d19b7df2ff9e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	4545	2025-04-17	\N	2025-10-31 14:13:07.379688	キクタミキ	\N
8bf6515c-7eac-4c51-ad1d-04db5c95c450	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2025-04-17	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
66c90089-2b11-4286-a628-7da42ca617e1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2025-04-18	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
6730541a-af1e-46ee-b1f6-79506ca01691	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-03-07	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
b187cd4d-5923-435d-ba5e-93db4584633f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	318181	2025-04-21	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
a11be12c-bee9-4163-9a41-6a0549c00220	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-03-19	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
573c31e9-0799-4282-89ec-34be53a4f422	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-04-24	\N	2025-10-31 14:13:07.379688	村上翼	\N
6f055dc9-c805-4d3f-97d8-459a35fd87b6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	105000	2025-04-21	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
3469f9ca-88e2-4392-8cae-fa13b7870b9d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-04-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
fd1eb5b9-cdd8-422b-8f8a-3ede238fd8ad	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-05-30	\N	2025-10-31 14:13:07.379688	doppler.new	\N
e8e193d3-ccbd-404e-9211-fbb8019e4846	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	9000	2025-04-24	\N	2025-10-31 14:13:07.379688	吉田淳一	\N
4e6b1e76-e70a-451f-b467-a0c4cddb9cf3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	485000	2025-02-25	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
edb0788e-2091-4f7c-824a-e30e3cc0dd5b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	80000	2025-04-26	\N	2025-10-31 14:13:07.379688	Unknown_208	\N
79e6ae77-66f2-4357-80f0-5b231f2677ad	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-04-28	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
c6cc1464-0523-4347-967d-bc2071d48df8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-04-30	\N	2025-10-31 14:13:07.379688	Unknown_210	\N
6df4ee4c-ee49-41a9-a786-2e447c4c1d11	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-04-30	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
5b06c74e-1659-4e23-aa0f-ffafe1974cbf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	2000	2025-04-30	\N	2025-10-31 14:13:07.379688	YUMI	\N
530777fc-d7b4-4ab4-926e-377c0226ac6d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-05-24	\N	2025-10-31 14:13:07.379688	epi	\N
40154aa4-7874-4b56-a4fc-41d70ac45ead	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-05-28	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
bb2f213b-7e30-4821-8b99-d721401ed3a9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	318181	2025-05-29	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
3d945d69-dce2-4061-8fe6-510e12995b7e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	3500	2025-05-02	\N	2025-10-31 14:13:07.379688	山本さきこ	\N
7ffd162d-adc1-48b9-af8b-d5d1255dc801	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	45000	2025-05-31	\N	2025-10-31 14:13:07.379688	野中美里	\N
450b0fce-6fad-44b4-85f1-77218f42fdcb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10000	2025-05-21	\N	2025-10-31 14:13:07.379688	渋澤樹里	\N
1dd80e1e-1037-4c37-a608-4d1f95e72fb0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-05-31	\N	2025-10-31 14:13:07.379688	Unknown_219	\N
f26938f0-6787-4dc5-8747-9540046eb4f4	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	50000	2025-05-15	\N	2025-10-31 14:13:07.379688	HIKARI屋	\N
35003544-5744-4d81-a2c5-7991116dc6a2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-05-28	\N	2025-10-31 14:13:07.379688	Unknown_221	\N
7e9c7ffc-32d0-4554-a6b1-b9561ad871d5	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2025-05-21	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
e5bf65bf-003c-4e4d-8f02-42d3137f9579	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-05-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
d4af8420-ac22-47c8-bedd-ed9332632bc1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	290	2025-05-15	\N	2025-10-31 14:13:07.379688	Unknown_224	\N
c4c71e29-2468-440b-bdfe-6847219e72bd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	99200	2025-05-01	\N	2025-10-31 14:13:07.379688	Unknown_225	\N
06c00ab7-f6e1-4e84-8309-588017815041	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-05-20	\N	2025-10-31 14:13:07.379688	Unknown_226	\N
c4a419fb-76db-4fc3-a856-679971520322	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-05-13	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
d8abe557-e7e9-49d9-a36e-7b0ea6213e86	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-05-27	\N	2025-10-31 14:13:07.379688	村上翼	\N
5ff5de9e-8d32-4d5b-a51a-5b6627134d29	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-06-02	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
584ee66c-9691-4ff7-853a-ec705ab3435a	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	신규매출	\N	30000	2025-06-04	\N	2025-10-31 14:13:07.379688	スマート健康クリニック	\N
a1bdf3c1-6289-40cc-8ec2-473e1e0072a3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	136363	2024-07-27	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
7cd27ff6-842c-4634-b88a-d93bb63eb4ce	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	90909	2024-07-28	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
53257c89-6d84-4b45-80bb-4f11c85f39e3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2024-12-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
b20d8810-dbe0-414f-9943-796eec2b9358	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	12727	2024-07-30	\N	2025-10-31 14:13:07.379688	湊谷千春	\N
a0bec563-24d3-4b13-81e5-aad5ca6aba78	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	154545	2024-07-31	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
405cec49-3ac6-4711-abd4-27b0e63ec564	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	109090	2024-08-08	\N	2025-10-31 14:13:07.379688	藤枝麻美	\N
d94bd878-f905-4aaa-bc46-b1cf484a5bae	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-08-30	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
6722840e-bf64-4dbb-b3a8-0d5129b5a64c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	31818	2024-08-08	\N	2025-10-31 14:13:07.379688	Sun Tribe miyakojima	\N
8262299b-1303-4366-85f3-1c1852aadde4	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	181818	2024-08-09	\N	2025-10-31 14:13:07.379688	清水 政隆	\N
75615826-f8f2-4e5c-a3b7-f903d73142ed	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	109090	2024-09-02	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
41966cfe-e38c-4c7d-a28c-0b084a4c3ea6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	154545	2024-09-02	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
1d4e5c22-6fb5-467f-b0a8-28572f51abf7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-11-25	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
2c2a7b22-c307-4f5a-8bf0-f8cabd1be7ef	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2024-11-25	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
326efe84-ba64-4b05-94ad-bb772873a967	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-11-25	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
82799e70-2c5d-4516-b197-23f32698c5d7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-11-29	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
8abeccfb-a8a9-4e25-ad2c-6f1887b1ebd9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2024-11-29	\N	2025-10-31 14:13:07.379688	Unknown_246	\N
51906495-7151-4b00-80d7-37c9ed5007b9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2024-11-28	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
5e6f2629-0431-4328-b8bb-c79eed3fe792	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	80000	2024-11-29	\N	2025-10-31 14:13:07.379688	browtique	\N
7a3b81fe-801c-4b14-80a1-249b732ae317	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-11-29	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
9dea541e-bbcc-4929-8073-d3adedd4b36e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10000	2024-11-08	\N	2025-10-31 14:13:07.379688	亀山友佳	\N
7edddc6f-169f-4c92-bd0f-14d65fd91786	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-02-26	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
b9b37355-01e7-417d-a51a-c7cdcfce35e8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	81818	2024-07-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
660324ed-9170-449e-bdb3-d13ea8e44061	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	90909	2024-07-09	\N	2025-10-31 14:13:07.379688	藤枝麻美	\N
9373f404-ff45-41b9-876e-420ee985266b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	81818	2024-07-06	\N	2025-10-31 14:13:07.379688	merci 石本 良太	\N
ae856fa8-4921-4f96-b664-cb729657b11d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	54545	2024-07-17	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
c4d3baa0-215e-4f10-84e5-7c76fe83c835	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	29090	2024-07-22	\N	2025-10-31 14:13:07.379688	epi	\N
45c3ca38-c2b5-4db9-b4e9-d439e24c3a7c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	63636	2024-07-23	\N	2025-10-31 14:13:07.379688	Unknown_257	\N
28d61b1e-b171-4d3b-9919-3927f3016a53	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2024-07-30	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
cb07b7fe-dff8-4355-99c9-6c24b3af6abe	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	100000	2024-12-06	\N	2025-10-31 14:13:07.379688	清水さん	\N
73129b5c-3891-4d35-9e80-5cab2735818a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-12-01	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
764bba65-593d-4525-a66e-71e78499750f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-12-14	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
eb8d2a9d-285d-4fc7-bae2-ee70251f3506	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2024-12-01	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
9fce823b-a426-4264-97bd-dd37e8328b3d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2024-12-01	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
170a3e6e-c1c5-4bdb-97b4-d60f5b43ce7b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2024-12-14	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
0d9efc4e-602d-4579-80f0-0651c06e9c5b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-01-01	\N	2025-10-31 14:13:07.379688	株式会社IFREA DINING	\N
6d57db15-e59c-488d-9fae-483669c61afc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-01-01	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
eeffbaf1-22e5-4d38-8ed6-f9cedd85338a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-01-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
6a214baf-e9f2-460f-b99d-ef6532137aca	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2025-01-10	\N	2025-10-31 14:13:07.379688	清水 彰人	\N
c7453e99-40db-4240-af4c-a3e5d23a01c6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-01-22	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
a4e92d92-2e51-4b32-9b81-a52a85b86346	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-01-31	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
5f2362da-a187-44e1-b5cc-cfcb4a0c28a9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-01-31	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
6fb91cd6-d83f-498b-9f5c-2913b80f9996	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-01-19	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
320898ee-c8f0-48b8-8b48-c0c5993e69ca	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-02-19	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
7ddff8bd-8af6-471f-863c-88468684b065	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	200000	2025-02-28	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
dd77c4c9-920a-4314-878e-829c0f1fa71c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-03-26	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
21a15882-f72b-4763-aa0c-42cace9b5997	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1000	2025-03-25	\N	2025-10-31 14:13:07.379688	ユミ	\N
95708d61-24bd-4dd7-b649-18573664a490	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1000	2025-03-01	\N	2025-10-31 14:13:07.379688	YUMI	\N
9699f70d-6634-4cec-adc8-607100d4239e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-03-01	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
7454b042-e3e8-4de8-a929-3b219db0a6b1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-04-25	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
59d8b826-5686-4adf-ba1c-db0771ea7c53	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-04-21	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
24461a02-83a0-4ce6-9d66-ea7dfb9685fe	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-04-01	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
7aace5be-1edf-4cdc-a7b4-228a46bf54ba	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-04-24	\N	2025-10-31 14:13:07.379688	epi	\N
211c2621-8cef-4819-9cd8-24f8c4e03f5a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	340000	2025-04-30	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
566dd11c-eaf1-4200-a871-f758a37cffcb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-05-30	\N	2025-10-31 14:13:07.379688	Unknown_284	\N
43bee81b-0e3c-4875-a340-97ced04874af	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-05-24	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
f50e4a08-6f96-4aeb-ab7a-7515c062d3dd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-05-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
87d2565c-aab7-4d90-a7c5-6ac527e2414f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-05-02	\N	2025-10-31 14:13:07.379688	doppler.new	\N
d8fb27db-ae00-4897-b7c3-8d4ab36ef042	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-05-31	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
3a65ae18-c229-4b68-bf58-40417643f032	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	290000	2025-05-31	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
5665032a-f1a4-434b-8a3b-cb57692f8722	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-05-15	\N	2025-10-31 14:13:07.379688	Unknown_290	\N
a548b466-7629-47c7-a909-43a37c62b318	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	5000	2025-05-21	\N	2025-10-31 14:13:07.379688	キクタミキ	\N
ed3bb126-d1fe-4fd5-9688-6c05375f2b22	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	7500	2025-05-11	\N	2025-10-31 14:13:07.379688	YUMI	\N
44321c75-c7e8-4260-bfb8-2cf76a677839	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	4545	2025-05-30	\N	2025-10-31 14:13:07.379688	田中 優奈 フラワーアーティスト	\N
e639ca97-ccdc-42a2-a1bd-ec84a029b096	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-05-15	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
b5d5563a-71bb-4962-9cdb-6a56876d30f4	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-05-06	\N	2025-10-31 14:13:07.379688	TRUE DESIGN CLINIC	\N
d6726459-faf9-481c-ab1e-41927d433b1e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-05-15	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
08dcfe18-62dc-4413-8208-18e50b7daa54	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2025-05-11	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
b87bd495-2c6e-4487-983d-5fbcb2bfb49e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2025-05-26	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
ba22dab9-875b-4493-9600-60a0e5dc5280	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-06-06	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
2c0d77bb-d764-4d17-b07f-a4d53edc1ef7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	10000	2025-06-06	\N	2025-10-31 14:13:07.379688	Unknown_300	\N
9987f7d8-74bc-4bc6-b0e9-0b2442c7dffb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	80000	2025-06-09	\N	2025-10-31 14:13:07.379688	楠彩花	\N
58fc5206-9dad-40ae-923c-411959d8a038	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	100000	2025-06-09	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
9e380f20-8405-449e-aa83-670a61627c4c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	50000	2025-06-22	\N	2025-10-31 14:13:07.379688	Unknown_303	\N
07fefdd2-9f4a-4b2b-91a8-c468de51c96f	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	신규매출	\N	10000	2025-07-08	\N	2025-10-31 14:13:07.379688	八鍼灸院	\N
40324a46-e9c7-4f82-b9e2-c2ec755a814b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-06-27	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
32e1b49b-b83b-49ca-941f-a978dfbe355d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	136363	2025-06-30	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
65165d09-b988-4a5c-8298-8306eac96518	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-06-06	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
b30d5901-b655-4499-856e-19db564bfd12	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-11	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
6aa5f6d4-60ac-4be9-8c7c-78388207864a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-06-06	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
25440632-3bbc-468d-844a-3996817a8760	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-06-17	\N	2025-10-31 14:13:07.379688	browtique	\N
a18b76a3-0ffb-4a71-b398-5d0a9a0df1fa	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2025-06-10	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
71397992-4716-4cbd-80e9-8e47703f33a7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-07-09	\N	2025-10-31 14:13:07.379688	楠彩花	\N
e31db411-bbdb-4329-be98-562ad16d1fb7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-06-16	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
fdeb5a5f-c135-471d-a487-ff89f5c32b17	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2025-06-14	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
38ef51c2-e9bd-4268-b2d0-c1f4ccaa03d3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	250000	2025-06-10	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
10c2a732-9632-42cd-918e-b98cd2dbae8b	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	신규매출	\N	60000	2025-06-11	\N	2025-10-31 14:13:07.379688	山崎美雪	\N
fe1458ad-388f-48af-9617-0b9757c41a25	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	신규매출	\N	70000	2025-06-11	\N	2025-10-31 14:13:07.379688	カタヤマ タツミ	\N
114b424e-b5dc-40cb-b3e6-2a4bbab12969	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-06-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
e3360fcc-168a-4e56-ab73-70fe4e977cd1	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	신규매출	\N	70000	2025-06-21	\N	2025-10-31 14:13:07.379688	元橋 啓太	\N
4f227ddb-b2eb-42f0-8985-b5e8527dfdd5	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
d06628e3-decf-4528-9672-ee3c2c2aa192	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-06-11	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
9c728b43-9386-4a6a-a583-db1d68bd1f73	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-06-27	\N	2025-10-31 14:13:07.379688	doppler.new	\N
503ce153-7e0d-45b5-807e-81e312eb3b2b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	318181	2025-06-27	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
4e37633e-442a-43cc-826f-4a948f9ea348	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-06-27	\N	2025-10-31 14:13:07.379688	Unknown_324	\N
8cae4fa1-e952-4422-9db1-2e48adfa4f46	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-06-28	\N	2025-10-31 14:13:07.379688	村上翼	\N
9aee633a-1ea7-4e35-bee2-fcbc0430f64b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-06-30	\N	2025-10-31 14:13:07.379688	星野翔太	\N
2dc54607-bc9f-4dd5-8772-ccb91c20a8c6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	65000	2025-06-30	\N	2025-10-31 14:13:07.379688	Unknown_327	\N
2b1873ee-7d28-4bed-93bb-7871de6a638b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-06-30	\N	2025-10-31 14:13:07.379688	株式会社efub	\N
7519b5fd-3bc8-4446-afc4-190f92f53a35	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	35000	2025-06-30	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
87bbb893-d73e-478b-8bc6-ed456384a93c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	250000	2025-07-10	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
7a6b4227-06b5-4f5f-8c66-d6aea6c90f38	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	연장매출	\N	60000	2025-07-12	\N	2025-10-31 14:13:07.379688	山崎美雪	\N
6b373ba1-58ee-46cb-a0b1-a3301d10246e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	270000	2025-06-30	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
38bb1e20-60b9-4b1b-b04c-6fe0f94bf81b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
1e39da3c-9b34-4873-bde4-86f543b64b8b	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	신규매출	\N	35000	2025-07-02	\N	2025-10-31 14:13:07.379688	スマート健康クリニック	\N
7b088996-0174-4a05-b9e7-9b94ba07cb9a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	45000	2025-07-02	\N	2025-10-31 14:13:07.379688	野中美里	\N
75958eb4-be64-4d9d-96f8-48f3f690db23	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	45000	2025-07-01	\N	2025-10-31 14:13:07.379688	太田優斗	\N
4a1f2303-7719-4b00-ae74-68a63a8b6164	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-07-09	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
a68b3705-9748-4787-8ec4-a703742ef05c	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	70000	2025-07-10	\N	2025-10-31 14:13:07.379688	カタヤマ タツミ	\N
4b978479-a62b-43d9-b7cb-4047807220ac	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	신규매출	\N	54545	2025-07-17	\N	2025-10-31 14:13:07.379688	小松崎祐太	\N
9fd72f53-63ea-451e-87ed-bcf4a360f9e3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	65000	2025-08-29	\N	2025-10-31 14:13:07.379688	Cafe Madu ENOSHIMA	\N
3e94e0e8-c173-4ea0-862b-53506f4acc23	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
e8571428-9f1e-41c3-90fa-fd2333289e66	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
9b65fc09-dfa6-4f20-95be-c20bc9615a16	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
5e3e64ac-a597-43bf-a99c-663837a121c7	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-06-25	\N	2025-10-31 14:13:07.379688	epi	\N
7632667d-7563-482a-a7d3-eb61437cd916	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-07-06	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
b0b17472-5ff7-4989-b399-5e6b136e58dd	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-07-18	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
32a94c98-50a5-474a-aeba-ea7781111977	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-07-15	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
eaf9281e-2f03-4a38-98bc-5e0575adaef1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-07-12	\N	2025-10-31 14:13:07.379688	browtique	\N
87b2aa9c-aac7-40a0-aa36-958aba6f1ea6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1000	2025-07-20	\N	2025-10-31 14:13:07.379688	ユミ	\N
cd180747-27cc-4cfb-a606-a9bde754e0e2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	500	2025-07-11	\N	2025-10-31 14:13:07.379688	ユミ	\N
191024a2-bd89-42ec-939f-332825b27ce2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	7500	2025-07-16	\N	2025-10-31 14:13:07.379688	ユミ	\N
e9c503eb-6a11-47b2-91cc-7f1fba3e503e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-07-16	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
e2267171-2f20-4c25-a629-c43ec39c1d63	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-07-14	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
3b117d94-3c78-4c68-87e1-5592aa0a4da4	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	112000	2025-07-10	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
d9475b77-4ed3-4474-b5dd-4d9aff30a66c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	50000	2025-08-01	\N	2025-10-31 14:13:07.379688	merci 石本 良太	\N
440fad03-a146-4f79-b64f-5ea9143cc4d0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-07-05	\N	2025-10-31 14:13:07.379688	Sun Tribe miyakojima	\N
ae146f68-1f9f-4d08-b3eb-af414eeb54a3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	270000	2025-07-30	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
84e0cab8-683c-4930-a746-05a8e07794f3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	27272	2025-07-22	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
a24b8189-9285-47c8-be81-cf30d21c2697	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	159090	2025-07-24	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
1fd2658c-27bf-4614-93c4-9bd088d8b672	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	400000	2025-07-29	\N	2025-10-31 14:13:07.379688	the artmake tokyo	\N
36dda2b9-0078-4f0b-99fa-45dcae636e94	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30454	2025-07-30	\N	2025-10-31 14:13:07.379688	村上翼	\N
9acc4265-c677-4613-80c7-620474b8f22f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	65000	2025-07-31	\N	2025-10-31 14:13:07.379688	Cafe Madu ENOSHIMA	\N
f48edff4-0f1f-4cd4-874f-30ab2f31c5ec	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-07-31	\N	2025-10-31 14:13:07.379688	株式会社efub	\N
8406b623-53d6-4d82-9ae6-ae616b78899b	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	50000	2025-07-31	\N	2025-10-31 14:13:07.379688	la studio	\N
181f6cde-04be-4b23-a52d-d566d140a5bf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-08-01	\N	2025-10-31 14:13:07.379688	HIKARI屋	\N
8f564cd9-cfae-44a2-9c11-d38acd437b25	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	연장매출	\N	80000	2025-08-01	\N	2025-10-31 14:13:07.379688	山崎美雪	\N
5d3554aa-2bc9-4ac1-8405-79a1ab83d1be	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	연장매출	\N	35000	2025-08-02	\N	2025-10-31 14:13:07.379688	すまはぴかふぇ	\N
0ce39cd7-3415-4ba9-902e-b0a0ec387cc2	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	54545	2025-08-07	\N	2025-10-31 14:13:07.379688	小松崎祐太	\N
280c9203-82ca-4a58-a641-8fd410fc4226	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	54545	2025-08-07	\N	2025-10-31 14:13:07.379688	小松崎祐太	\N
ac9e592f-5da6-4ae1-a115-d349c2c378c0	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	70000	2025-08-12	\N	2025-10-31 14:13:07.379688	カタヤマ タツミ	\N
e31be21a-72e1-4ee0-a673-ac94801168b5	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	신규매출	\N	4800	2025-08-20	\N	2025-10-31 14:13:07.379688	Unknown_371	\N
2d9108e5-b2bc-4c57-9fd9-85d3700b1d33	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-08-04	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
0670e410-aa87-4d99-944a-5b3a311a2c9d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-08-14	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
5f4ae220-164c-4cc8-9801-684a69d20a7a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-08-15	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
97ce8576-7f18-4d7d-ac59-0b93f11af688	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-08-18	\N	2025-10-31 14:13:07.379688	楠彩花	\N
ab8badd9-ed8b-4c03-bb0a-8df99f8058ea	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	114726	2025-08-20	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
4e23410e-2695-455c-a848-d8b9aa9baac9	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	신규매출	\N	50000	2025-08-21	\N	2025-10-31 14:13:07.379688	創彩鉄板ほおずき	\N
57d8e9cf-d16d-4e03-843f-72090dab040d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-08-25	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
5d5608e0-7f9f-4c43-88e5-bf427510ea8e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-08-23	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
6c18e03c-2681-4059-81d3-295c99df4f72	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-08-25	\N	2025-10-31 14:13:07.379688	星野翔太	\N
18e6be09-8dd0-4c40-8d87-80694c1a17a3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-08-21	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
1f9d186d-3928-4180-a958-2fb267035500	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-08-28	\N	2025-10-31 14:13:07.379688	村上翼	\N
c3e7a2a8-d043-46ee-8743-08af2ea58bb2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-08-28	\N	2025-10-31 14:13:07.379688	HIKARI屋	\N
525ebb1c-ceb8-4757-bcb5-3b7981ea8b25	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	239090	2025-08-28	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
0830f82c-ffee-41d3-932a-fff8a860806c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	20000	2025-08-29	\N	2025-10-31 14:13:07.379688	株式会社efub	\N
50082d72-1fae-46f9-850b-0748787f6106	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	22500	2025-08-29	\N	2025-10-31 14:13:07.379688	野中美里	\N
4b403d04-3524-4093-af9a-adc9f71e3426	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-08-29	\N	2025-10-31 14:13:07.379688	la studio	\N
12cfd148-e3b3-4bcd-86b2-1c97ecddaad1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-08-31	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
e792b279-c0bd-4853-aa0c-8658b255bc91	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	200000	2025-09-01	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
534615c5-1fe9-469f-bd21-1bc678b84ed9	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	15000	2025-08-29	\N	2025-10-31 14:13:07.379688	Cafe Madu ENOSHIMA	\N
828deb8d-6a85-4e91-bdba-bf5d17421835	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-09-01	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
cf7513b8-e962-4f47-9466-d408aa44b3c0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-09-01	\N	2025-10-31 14:13:07.379688	browtique	\N
3f40369c-4105-43df-bd55-7eecd0cf8b91	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	연장매출	\N	35000	2025-09-01	\N	2025-10-31 14:13:07.379688	すまはぴかふぇ	\N
385ca3ef-6dbf-4f18-afb8-90107f4978e2	\N	db0a8e81-9569-4a85-bf33-78e503eeb6f0	연장매출	\N	50000	2025-09-11	\N	2025-10-31 14:13:07.379688	山崎美雪	\N
bd9d3620-fdf0-45f7-9e5d-49a086016b66	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	113000	2025-09-05	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
be9df8fc-1eae-4086-a568-e9c005409836	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-09-10	\N	2025-10-31 14:13:07.379688	merci 石本 良太	\N
586a0296-8eec-46b9-8b32-cca3a906c03c	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	70000	2025-09-20	\N	2025-10-31 14:13:07.379688	Unknown_397	\N
03cbc8cd-0451-43a4-8128-482db237119a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-09-18	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
e65f5907-36bb-49af-976f-ee572817fc0a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	240000	2025-09-22	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
3cee76f0-62b6-4ccc-a013-e282bcdec4bf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	95000	2025-09-23	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
82ea9db4-28d5-4757-8b57-2ae1bab49211	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-09-24	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
f6ef49fd-f3e4-4590-ac34-2a23922f7c94	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-09-24	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
bdb35262-fb2d-4692-ac8e-25ba09ba2ac2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1500	2025-09-17	\N	2025-10-31 14:13:07.379688	Cafe Madu ENOSHIMA	\N
7dc45437-d9b5-42d7-9238-4cb9c7a41ab6	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-09-25	\N	2025-10-31 14:13:07.379688	楠彩花	\N
10773818-6438-4936-9fbb-e17d8d2469a8	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-09-25	\N	2025-10-31 14:13:07.379688	browtique	\N
36364178-b739-4e2a-bdc6-824e5e940a5c	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-09-25	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
481d6567-6cac-4254-9685-13786c721a25	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-09-26	\N	2025-10-31 14:13:07.379688	村上翼	\N
f7ec68e5-1a9a-4b0f-9c3e-6ebc1814991a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-09-27	\N	2025-10-31 14:13:07.379688	HIKARI屋	\N
a93dbec0-0a70-4691-bfb4-c3321b8ab21d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-09-29	\N	2025-10-31 14:13:07.379688	星野翔太	\N
955a26bb-b3e6-4e57-94bf-73b9005c6bce	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-09-29	\N	2025-10-31 14:13:07.379688	la studio	\N
67d55fde-1b6a-4608-b2c9-5b2182572037	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	2000	2025-09-30	\N	2025-10-31 14:13:07.379688	ユミ	\N
11aa173f-1ec6-4442-bf6d-ed5910cae5bb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	200000	2025-09-30	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
9477f14e-b7ca-4fb7-a2fb-fb9c65d75647	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	60000	2025-09-30	\N	2025-10-31 14:13:07.379688	Cafe Madu ENOSHIMA	\N
0b84cca1-63d0-4fb0-8041-3b0b291312c3	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	150000	2025-09-30	\N	2025-10-31 14:13:07.379688	株式会社オールディッシュ	\N
28cb676c-c2c2-4986-8f50-cf77338a622e	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	40000	2025-09-30	\N	2025-10-31 14:13:07.379688	株式会社アチーブ	\N
02cf6bad-ac23-4294-9a43-d3d9bf0a73ac	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	22500	2025-09-30	\N	2025-10-31 14:13:07.379688	野中美里	\N
94b3663c-b2cd-4f18-a3ac-c8a31bcc3383	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	1363	2025-10-03	\N	2025-10-31 14:13:07.379688	増田栄里	\N
6d2a2075-26d8-46ab-8c7c-a268141ddc2f	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	239090	2025-10-02	\N	2025-10-31 14:13:07.379688	ネイティブキャンプ	\N
7d14259f-6124-44d9-911a-a29f78df3165	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	15000	2025-10-01	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
178795c2-d507-47a9-9bba-6c20b86467bb	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	16500	2025-10-08	\N	2025-10-31 14:13:07.379688	寺川陸斗 | 埼玉市グルメ	\N
acdbdd11-1575-4bdd-afd5-7c38c9eae6d2	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	40000	2025-10-21	\N	2025-10-31 14:13:07.379688	株式会社カルミネーション	\N
73628f9f-6432-4edc-b4f6-e3de236693ef	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	300000	2025-10-21	\N	2025-10-31 14:13:07.379688	株式会社CR Vision	\N
2713bdf7-55f2-430a-b473-b6cabc0264dc	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	72727	2025-10-23	\N	2025-10-31 14:13:07.379688	峯 愁矢	\N
01bb7131-d34f-4934-b661-95ca58b9ceda	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	125000	2025-10-23	\N	2025-10-31 14:13:07.379688	株式会社わかば	\N
642829c8-4b82-4582-9652-a9e8c7f801c0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-10-27	\N	2025-10-31 14:13:07.379688	browtique	\N
dd86b9c1-ab0a-4e8b-838e-80bf44236f72	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	120000	2025-10-27	\N	2025-10-31 14:13:07.379688	株式会社トラフィックラボ	\N
400003a6-b108-49e3-8295-92c93d715ed1	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-10-27	\N	2025-10-31 14:13:07.379688	高橋涼介	\N
119c04a5-61dd-4dda-9d6f-3663bd17fb5a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	113000	2025-10-27	\N	2025-10-31 14:13:07.379688	株式会社エモーション	\N
164b25c2-85fd-4ac8-9036-2a71fa4f488a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-10-27	\N	2025-10-31 14:13:07.379688	馬場春樹	\N
ad3c4f64-faed-4cdd-8187-b454d8fd80ac	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	80000	2025-10-27	\N	2025-10-31 14:13:07.379688	楠彩花	\N
1a1ca2c5-51cf-40c9-8d80-42fc24a74ff1	\N	53578a31-fe51-4a31-91e3-5b798b3e192a	연장매출	\N	70000	2025-10-27	\N	2025-10-31 14:13:07.379688	カタヤマ タツミ	\N
4a46a900-7d58-4faf-83a8-12d236419f05	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	30000	2025-10-28	\N	2025-10-31 14:13:07.379688	星野翔太	\N
092bc539-d303-4fbf-94fb-2665c0affa33	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-29	\N	2025-10-31 14:13:07.379688	ミツイシ ユキ	\N
cb912686-8d27-4dce-aabc-7c7336741a0d	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-29	\N	2025-10-31 14:13:07.379688	株式会社CIEL.	\N
c1f44fdf-fc73-4522-8ffc-1e949f08291a	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	50000	2025-10-29	\N	2025-10-31 14:13:07.379688	la studio	\N
6e468641-732e-46e1-a207-d3091697f4be	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-29	\N	2025-10-31 14:13:07.379688	株式会社CIEL.	\N
9340905c-a129-49d0-ab12-d3957c6db9cf	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-29	\N	2025-10-31 14:13:07.379688	株式会社CIEL.	\N
91bee44a-042e-4e6a-ac8b-6567a1c7c844	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-30	\N	2025-10-31 14:13:07.379688	門脇 文武	\N
305f8b8d-989b-419a-bb2b-df70b008fab0	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	신규매출	\N	30000	2025-10-30	\N	2025-10-31 14:13:07.379688	ブライダルプラス	\N
0e826440-12b7-4dab-9f11-df4090bd4724	\N	ca5fb2e2-bff8-4f40-9111-195833c2aace	연장매출	\N	200233	2025-10-31	\N	2025-10-31 14:13:07.379688	イーストナイン	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.services (id, name, category) FROM stdin;
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.teams (id, name, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: go
--

COPY public.users (id, name, email, password, team, role, created_at) FROM stdin;
ca5fb2e2-bff8-4f40-9111-195833c2aace	山﨑水優	m5ymsk@hotseller.co.kr	$2a$10$olGK4oH0wAhtW1FbGuWES.h49jTsJ4r2KJzruaPYfWeRfkI0duleG	\N	user	2025-10-30 05:30:43.213
2f645ad0-a922-4e3e-a52b-09b47f3e5fd3	安藤葵	amao0423@hotseller.co.kr	$2a$10$80VqHoSc.WqmiVZdoFqDqeuVlL/WIg6gwOqL/qVYBNVJLUwFrKVZ2	\N	user	2025-10-30 05:31:00.273
53578a31-fe51-4a31-91e3-5b798b3e192a	山下南	m.yamashita@hotseller.co.kr	$2a$10$KIlQbGRV9oOczOOwkR7F3OFe9mEI52xggHCKEx31MzXcM.JkdojHi	\N	user	2025-10-30 05:31:20.919
00ba37e3-976c-4097-a14d-afc789485f26	石黒杏奈	ishiguro_a27@hotseller.co.kr	$2a$10$e8976HR8FCPOlNW4s9FZf.oGilTpzs4YeJI7c0r5aqKy4/QhKjP4u	\N	user	2025-10-30 05:31:43.955
b3ae935c-d909-4f80-a979-c8035e73132c	中村さくら	umm240227@hotseller.co.kr	$2a$10$Ee9Eb5lHbmEtXzACm.PSWu8FXxNvpAmqDevqSKkYPXsSoAbHeQmou	\N	user	2025-10-30 05:31:59.854
db0a8e81-9569-4a85-bf33-78e503eeb6f0	石井瞳	ishiih03@hotseller.co.kr	$2a$10$9JPbJTZb5hk46Akcit7ff.7rSD9qcuOSlYcIDyK2R5dCnqlhcrxtu	\N	user	2025-10-30 05:32:42.089
8e03b46f-d14c-4d9a-8742-9f6fa6fd572f	JEYI	j0705@hotseller.co.kr	$2a$10$d9GtiwbkvmsXGaBocmR7L.uqNSEc9WbTFrj6wXrRETqrkDdxPEoQW	\N	user	2025-10-30 07:11:43.006
eb620f65-eac3-40d5-a902-9c991287ace3	고은호	god2364928@hotseller.co.kr	$2a$10$3ymjTvPGXEWmbeJpJ2Zpc.kGMzUKSJL5QAIJkOqq.RIOcUlB6FqzK	\N	admin	2025-10-27 10:41:33.207
\.


--
-- Name: customer_history customer_history_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: payment_types payment_types_code_key; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.payment_types
    ADD CONSTRAINT payment_types_code_key UNIQUE (code);


--
-- Name: payment_types payment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.payment_types
    ADD CONSTRAINT payment_types_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: retargeting_customers retargeting_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.retargeting_customers
    ADD CONSTRAINT retargeting_customers_pkey PRIMARY KEY (id);


--
-- Name: retargeting_history retargeting_history_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.retargeting_history
    ADD CONSTRAINT retargeting_history_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: services services_name_key; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key UNIQUE (name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_customer_history_customer_id; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_customer_history_customer_id ON public.customer_history USING btree (customer_id);


--
-- Name: idx_customers_manager; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_customers_manager ON public.customers USING btree (manager);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_payments_manager; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_payments_manager ON public.payments USING btree (manager_user_id);


--
-- Name: idx_payments_paid_at; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_payments_paid_at ON public.payments USING btree (paid_at);


--
-- Name: idx_payments_payment_type; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_payments_payment_type ON public.payments USING btree (payment_type_id);


--
-- Name: idx_payments_service; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_payments_service ON public.payments USING btree (service_id);


--
-- Name: idx_retargeting_customers_manager; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_retargeting_customers_manager ON public.retargeting_customers USING btree (manager);


--
-- Name: idx_retargeting_customers_status; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_retargeting_customers_status ON public.retargeting_customers USING btree (status);


--
-- Name: idx_retargeting_history_customer_id; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_retargeting_history_customer_id ON public.retargeting_history USING btree (retargeting_customer_id);


--
-- Name: idx_sales_contract_date; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_sales_contract_date ON public.sales USING btree (contract_date);


--
-- Name: idx_sales_user_id; Type: INDEX; Schema: public; Owner: go
--

CREATE INDEX idx_sales_user_id ON public.sales USING btree (user_id);


--
-- Name: customer_history customer_history_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_history customer_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.customer_history
    ADD CONSTRAINT customer_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: payments payments_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.users(id);


--
-- Name: retargeting_history retargeting_history_retargeting_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.retargeting_history
    ADD CONSTRAINT retargeting_history_retargeting_customer_id_fkey FOREIGN KEY (retargeting_customer_id) REFERENCES public.retargeting_customers(id) ON DELETE CASCADE;


--
-- Name: retargeting_history retargeting_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.retargeting_history
    ADD CONSTRAINT retargeting_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: go
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sLqH6vHRfOksA8ffZ4qEqOSclHJuUDguBEgkoIdff9yJRAaPXbYjL5pcfWzXfs8

