--
-- PostgreSQL database dump
--

\restrict iYwe1ej05lYQ5IiFFKBrvK77ZJOBUbsSCtf6jgr75QbyP9Fgue1bpREZIRZSwFJ

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

\unrestrict iYwe1ej05lYQ5IiFFKBrvK77ZJOBUbsSCtf6jgr75QbyP9Fgue1bpREZIRZSwFJ

