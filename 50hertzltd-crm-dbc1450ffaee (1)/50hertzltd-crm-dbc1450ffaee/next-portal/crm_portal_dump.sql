--
-- PostgreSQL database dump
--

\restrict SlGIJg8rS0RqYJbyxDPte3TyxyFbIqIWPIjlLyQhZTLFcceBLXOurDSBjoLia1f

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

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trips DROP CONSTRAINT IF EXISTS trips_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trips DROP CONSTRAINT IF EXISTS trips_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trip_approvals DROP CONSTRAINT IF EXISTS trip_approvals_trip_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trip_approvals DROP CONSTRAINT IF EXISTS trip_approvals_approver_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_trip_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_requester_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.query_approvals DROP CONSTRAINT IF EXISTS query_approvals_requested_by_fkey;
ALTER TABLE IF EXISTS ONLY public.query_approvals DROP CONSTRAINT IF EXISTS query_approvals_query_id_fkey;
ALTER TABLE IF EXISTS ONLY public.query_approvals DROP CONSTRAINT IF EXISTS query_approvals_approver_id_fkey;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_responsibility_to_id_fkey;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_raised_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_pss_id_fkey;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_approved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.client_pss DROP CONSTRAINT IF EXISTS client_pss_client_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_uploaded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.trips DROP CONSTRAINT IF EXISTS trips_pkey;
ALTER TABLE IF EXISTS ONLY public.trip_approvals DROP CONSTRAINT IF EXISTS trip_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_pkey;
ALTER TABLE IF EXISTS ONLY public.query_approvals DROP CONSTRAINT IF EXISTS query_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_query_code_key;
ALTER TABLE IF EXISTS ONLY public.queries DROP CONSTRAINT IF EXISTS queries_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.client_pss DROP CONSTRAINT IF EXISTS client_pss_pkey;
ALTER TABLE IF EXISTS ONLY public.attachments DROP CONSTRAINT IF EXISTS attachments_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.trips ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.trip_approvals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.query_approvals ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.queries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.client_pss ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attachments ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.trips_id_seq;
DROP TABLE IF EXISTS public.trips;
DROP SEQUENCE IF EXISTS public.trip_approvals_id_seq;
DROP TABLE IF EXISTS public.trip_approvals;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.requests_id_seq;
DROP TABLE IF EXISTS public.requests;
DROP SEQUENCE IF EXISTS public.query_approvals_id_seq;
DROP TABLE IF EXISTS public.query_approvals;
DROP SEQUENCE IF EXISTS public.queries_id_seq;
DROP TABLE IF EXISTS public.queries;
DROP SEQUENCE IF EXISTS public.clients_id_seq;
DROP TABLE IF EXISTS public.clients;
DROP SEQUENCE IF EXISTS public.client_pss_id_seq;
DROP TABLE IF EXISTS public.client_pss;
DROP SEQUENCE IF EXISTS public.attachments_id_seq;
DROP TABLE IF EXISTS public.attachments;
DROP TYPE IF EXISTS public.trip_status;
DROP TYPE IF EXISTS public.technology;
DROP TYPE IF EXISTS public.role_name;
DROP TYPE IF EXISTS public.request_type;
DROP TYPE IF EXISTS public.request_status;
DROP TYPE IF EXISTS public.query_status;
DROP TYPE IF EXISTS public.owner_type;
--
-- Name: owner_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.owner_type AS ENUM (
    'QUERY',
    'TRIP',
    'CLIENT'
);


--
-- Name: query_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.query_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'ESCALATED',
    'CLOSED',
    'REOPENED',
    'PENDING_FROM_CLIENT'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_type AS ENUM (
    'TRIP',
    'CLIENT'
);


--
-- Name: role_name; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_name AS ENUM (
    'ADMIN',
    'EMPLOYEE',
    'MANAGER',
    'GM'
);


--
-- Name: technology; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.technology AS ENUM (
    'SOLAR',
    'WIND',
    'SOLAR_WIND',
    'SOLAR_WIND_BATTERY',
    'SOLAR_BATTERY',
    'WIND_BATTERY'
);


--
-- Name: trip_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.trip_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id integer NOT NULL,
    owner_type public.owner_type NOT NULL,
    owner_id integer NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    content_type text NOT NULL,
    uploaded_by integer NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attachments_id_seq OWNED BY public.attachments.id;


--
-- Name: client_pss; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_pss (
    id integer NOT NULL,
    client_id integer NOT NULL,
    name text NOT NULL,
    capacity_mw numeric(10,2),
    technology public.technology,
    state text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sps boolean DEFAULT false NOT NULL,
    aggregation boolean DEFAULT false NOT NULL,
    transmission_type text,
    CONSTRAINT client_pss_transmission_type_check CHECK ((transmission_type = ANY (ARRAY['STU'::text, 'CTU'::text])))
);


--
-- Name: client_pss_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_pss_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_pss_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_pss_id_seq OWNED BY public.client_pss.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name text NOT NULL,
    state text,
    is_approved boolean DEFAULT false NOT NULL,
    created_by integer,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queries (
    id integer NOT NULL,
    query_code text NOT NULL,
    client_id integer,
    pss_id integer,
    query_raised_date timestamp with time zone,
    query_entry_date timestamp with time zone,
    state text,
    pss_text text,
    "group" text,
    capacity_mw numeric(10,2),
    technology public.technology,
    transmission_type text,
    period_of_issue text,
    issue text NOT NULL,
    raised_by text,
    responsibility_to text,
    current_status public.query_status DEFAULT 'OPEN'::public.query_status NOT NULL,
    closed_date timestamp with time zone,
    delay text,
    expected_closure timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    raised_by_id integer,
    responsibility_to_id integer,
    close_request_date timestamp with time zone
);


--
-- Name: queries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.queries_id_seq OWNED BY public.queries.id;


--
-- Name: query_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_approvals (
    id integer NOT NULL,
    query_id integer NOT NULL,
    new_status public.query_status NOT NULL,
    requested_by integer NOT NULL,
    approver_id integer NOT NULL,
    decision public.request_status DEFAULT 'PENDING'::public.request_status NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    comment text
);


--
-- Name: query_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.query_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: query_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.query_approvals_id_seq OWNED BY public.query_approvals.id;


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id integer NOT NULL,
    request_type public.request_type NOT NULL,
    status public.request_status DEFAULT 'PENDING'::public.request_status NOT NULL,
    requester_id integer NOT NULL,
    trip_id integer,
    client_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name public.role_name NOT NULL,
    travel_budget numeric(10,2),
    lodging_budget numeric(10,2),
    food_budget numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: trip_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trip_approvals (
    id integer NOT NULL,
    trip_id integer NOT NULL,
    approver_id integer NOT NULL,
    sequence integer NOT NULL,
    decision public.request_status DEFAULT 'PENDING'::public.request_status NOT NULL,
    comment text,
    decided_at timestamp with time zone
);


--
-- Name: trip_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trip_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trip_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trip_approvals_id_seq OWNED BY public.trip_approvals.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    user_id integer NOT NULL,
    client_id integer NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    reason text NOT NULL,
    is_meeting boolean DEFAULT false NOT NULL,
    status public.trip_status DEFAULT 'PENDING_APPROVAL'::public.trip_status NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role_id integer NOT NULL,
    rank integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments ALTER COLUMN id SET DEFAULT nextval('public.attachments_id_seq'::regclass);


--
-- Name: client_pss id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pss ALTER COLUMN id SET DEFAULT nextval('public.client_pss_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: queries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries ALTER COLUMN id SET DEFAULT nextval('public.queries_id_seq'::regclass);


--
-- Name: query_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_approvals ALTER COLUMN id SET DEFAULT nextval('public.query_approvals_id_seq'::regclass);


--
-- Name: requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: trip_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_approvals ALTER COLUMN id SET DEFAULT nextval('public.trip_approvals_id_seq'::regclass);


--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attachments (id, owner_type, owner_id, file_name, file_path, content_type, uploaded_by, uploaded_at) FROM stdin;
\.


--
-- Data for Name: client_pss; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_pss (id, client_id, name, capacity_mw, technology, state, created_at, updated_at, sps, aggregation, transmission_type) FROM stdin;
1	1	Babara Torrent	150.00	SOLAR	GJ	2025-12-17 10:18:16.304866+05:30	2025-12-17 10:18:16.304866+05:30	t	t	\N
2	2	Babra(HYB)-Cleanmax	101.20	\N	GJ	2025-12-17 10:18:16.32868+05:30	2025-12-17 10:18:16.32868+05:30	t	t	\N
3	3	Bhavnagar S Continuum	113.50	SOLAR	GJ	2025-12-17 10:18:16.333716+05:30	2025-12-17 10:18:16.333716+05:30	t	t	\N
4	4	Bhogat	14.15	WIND	GJ	2025-12-17 10:18:16.339539+05:30	2025-12-17 10:18:16.339539+05:30	t	t	\N
5	5	Charanka	10.00	WIND	GJ	2025-12-17 10:18:16.345462+05:30	2025-12-17 10:18:16.345462+05:30	t	t	\N
6	6	Charanka 105	105.00	SOLAR	GJ	2025-12-17 10:18:16.34834+05:30	2025-12-17 10:18:16.34834+05:30	t	t	\N
7	1	Charanka - Torrent	42.30	SOLAR	GJ	2025-12-17 10:18:16.35084+05:30	2025-12-17 10:18:16.35084+05:30	t	t	\N
8	7	Dayapar	50.00	WIND	GJ	2025-12-17 10:18:16.355441+05:30	2025-12-17 10:18:16.355441+05:30	t	t	\N
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, state, is_approved, created_by, approved_by, approved_at, created_at, updated_at) FROM stdin;
1	Torrent Solargen Limited	GJ	t	\N	\N	\N	2025-12-17 10:17:08.107657+05:30	2025-12-17 10:17:08.107657+05:30
2	Cleanmax	GJ	t	\N	\N	\N	2025-12-17 10:18:16.327713+05:30	2025-12-17 10:18:16.327713+05:30
3	Continuum	GJ	t	\N	\N	\N	2025-12-17 10:18:16.331492+05:30	2025-12-17 10:18:16.331492+05:30
4	Rolex Rings Limited	GJ	t	\N	\N	\N	2025-12-17 10:18:16.338637+05:30	2025-12-17 10:18:16.338637+05:30
5	GUVNL	GJ	t	\N	\N	\N	2025-12-17 10:18:16.341544+05:30	2025-12-17 10:18:16.341544+05:30
6	Renew	GJ	t	\N	\N	\N	2025-12-17 10:18:16.347471+05:30	2025-12-17 10:18:16.347471+05:30
7	Inox Green Energy Services Limited	GJ	t	\N	\N	\N	2025-12-17 10:18:16.354637+05:30	2025-12-17 10:18:16.354637+05:30
\.


--
-- Data for Name: queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.queries (id, query_code, client_id, pss_id, query_raised_date, query_entry_date, state, pss_text, "group", capacity_mw, technology, transmission_type, period_of_issue, issue, raised_by, responsibility_to, current_status, closed_date, delay, expected_closure, created_at, updated_at, raised_by_id, responsibility_to_id, close_request_date) FROM stdin;
1	IMP-0001	1	1	2025-07-16 00:00:00+05:30	2025-07-15 00:00:00+05:30	GJ	Babara Torrent	Torrent	150.00	SOLAR	STU	05.05.25 to 11.05.25	High DSM	Advik S	Vaishali	CLOSED	2025-07-21 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.313627+05:30	2025-12-17 10:18:16.313627+05:30	1	3	\N
2	IMP-0002	1	1	2025-08-27 00:00:00+05:30	2025-08-26 00:00:00+05:30	GJ	Babara Torrent	Torrent	150.00	SOLAR	STU	12.05.25 to 08-06-25	High DSM	Advik S	Bhupendra	CLOSED	2025-09-01 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.320142+05:30	2025-12-17 10:18:16.320142+05:30	1	4	\N
3	IMP-0003	1	1	2025-09-03 00:00:00+05:30	2025-09-01 00:00:00+05:30	GJ	Babara Torrent	Torrent	150.00	SOLAR	STU	09.06.25 to 15.06.25	High DSM	Advik S	Bhupendra	CLOSED	2025-09-06 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.322331+05:30	2025-12-17 10:18:16.322331+05:30	1	4	\N
4	IMP-0004	1	1	2025-09-10 00:00:00+05:30	2025-09-08 00:00:00+05:30	GJ	Babara Torrent	Torrent	150.00	SOLAR	STU	16.06.25 to 22.06.25	High DSM	Advik S	Vaishali	CLOSED	2025-09-13 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.324258+05:30	2025-12-17 10:18:16.324258+05:30	1	3	\N
5	IMP-0005	1	1	2025-09-19 00:00:00+05:30	2025-09-18 00:00:00+05:30	GJ	Babara Torrent	Torrent	150.00	SOLAR	STU	23.06.25 to 29.06.25	High DSM	Advik S	Bhupendra	CLOSED	2025-09-23 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.326169+05:30	2025-12-17 10:18:16.326169+05:30	1	4	\N
6	IMP-0006	2	2	2025-07-09 00:00:00+05:30	2025-07-07 00:00:00+05:30	GJ	Babra(HYB)-Cleanmax	Cleanmax	101.20	\N	STU	30-06-25 to 06-07-25	High DSM	Advik S	Vaishali	CLOSED	2025-07-13 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.329941+05:30	2025-12-17 10:18:16.329941+05:30	1	3	\N
7	IMP-0007	3	3	2025-08-01 00:00:00+05:30	2025-07-31 00:00:00+05:30	GJ	Bhavnagar S Continuum	Continuum	113.50	SOLAR	CTU	01-05-25 to 30.05.25	High DSM	Advik S	Bhupendra	CLOSED	2025-08-06 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.334398+05:30	2025-12-17 10:18:16.334398+05:30	1	4	\N
8	IMP-0008	4	4	2025-08-16 00:00:00+05:30	2025-08-14 00:00:00+05:30	GJ	Bhogat	Rolex	14.15	WIND	STU	26-05-25 to 01-06-25	High DSM	Advik S	Vaishali	CLOSED	2025-08-19 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.340234+05:30	2025-12-17 10:18:16.340234+05:30	1	3	\N
9	IMP-0009	5	5	2025-07-19 00:00:00+05:30	2025-07-17 00:00:00+05:30	GJ	Charanka	GNFC	10.00	WIND	STU	16.02.25 to 18.05.25	High DSM	Advik S	Bhupendra	CLOSED	2025-07-23 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.346129+05:30	2025-12-17 10:18:16.346129+05:30	1	4	\N
10	IMP-0010	6	6	2025-09-07 00:00:00+05:30	2025-09-05 00:00:00+05:30	GJ	Charanka 105	Renew	105.00	SOLAR	STU	01-08-25 to 31-08-25	High DSM	Advik S	Vaishali	CLOSED	2025-09-10 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.349078+05:30	2025-12-17 10:18:16.349078+05:30	1	3	\N
11	IMP-0011	1	7	2025-09-20 00:00:00+05:30	2025-09-18 00:00:00+05:30	GJ	Charanka - Torrent	Torrent	42.30	SOLAR	\N	23.06.25 to 29.06.25	High DSM	Advik S	Vaishali	CLOSED	2025-09-24 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.351542+05:30	2025-12-17 10:18:16.351542+05:30	1	3	\N
12	IMP-0012	1	7	2025-07-17 00:00:00+05:30	2025-07-15 00:00:00+05:30	GJ	Charanka - Torrent	Torrent	42.30	SOLAR	STU	05-May-2025 to 11-May-2025	High DSM	Advik S	Vaishali	CLOSED	2025-07-21 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.353223+05:30	2025-12-17 10:18:16.353223+05:30	1	3	\N
13	IMP-0013	7	8	2025-07-12 00:00:00+05:30	2025-07-11 00:00:00+05:30	GJ	Dayapar	Inox	50.00	WIND	CTU	23.06.25 to 29.06.25	High DSM	Advik S	Vaishali	CLOSED	2025-07-17 00:00:00+05:30	\N	\N	2025-12-17 10:18:16.355996+05:30	2025-12-17 10:18:16.355996+05:30	1	3	\N
\.


--
-- Data for Name: query_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.query_approvals (id, query_id, new_status, requested_by, approver_id, decision, created_at, decided_at, comment) FROM stdin;
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, request_type, status, requester_id, trip_id, client_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, travel_budget, lodging_budget, food_budget, created_at, updated_at) FROM stdin;
1	ADMIN	\N	\N	\N	2025-11-18 13:02:57.543546+05:30	2025-11-18 13:02:57.543546+05:30
3	EMPLOYEE	\N	\N	\N	2025-12-17 10:16:47.885743+05:30	2025-12-17 10:16:47.885743+05:30
\.


--
-- Data for Name: trip_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trip_approvals (id, trip_id, approver_id, sequence, decision, comment, decided_at) FROM stdin;
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.trips (id, user_id, client_id, from_date, to_date, reason, is_meeting, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, name, role_id, rank, is_active, created_at, updated_at) FROM stdin;
1	advik.s@manikarananalytics.in	admin123	Advik S	1	1	t	2025-11-18 13:02:57.543546+05:30	2025-11-18 13:02:57.543546+05:30
2	himanshu.s@manikarananalytics.in	admin123	Himanshu S	1	1	t	2025-11-18 14:13:03.245643+05:30	2025-11-18 14:13:03.245643+05:30
3	vaishali@manikarananalytics.in	changeme	Vaishali	3	50	t	2025-12-17 10:17:08.070434+05:30	2025-12-17 10:17:08.070434+05:30
4	bhupendra@manikarananalytics.in	changeme	Bhupendra	3	50	t	2025-12-17 10:17:08.086539+05:30	2025-12-17 10:17:08.086539+05:30
\.


--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attachments_id_seq', 1, false);


--
-- Name: client_pss_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_pss_id_seq', 8, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 7, true);


--
-- Name: queries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.queries_id_seq', 13, true);


--
-- Name: query_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.query_approvals_id_seq', 1, false);


--
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requests_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- Name: trip_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trip_approvals_id_seq', 1, false);


--
-- Name: trips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trips_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: client_pss client_pss_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pss
    ADD CONSTRAINT client_pss_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: queries queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_pkey PRIMARY KEY (id);


--
-- Name: queries queries_query_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_query_code_key UNIQUE (query_code);


--
-- Name: query_approvals query_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_approvals
    ADD CONSTRAINT query_approvals_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: trip_approvals trip_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_approvals
    ADD CONSTRAINT trip_approvals_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: client_pss client_pss_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_pss
    ADD CONSTRAINT client_pss_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients clients_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: queries queries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: queries queries_pss_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_pss_id_fkey FOREIGN KEY (pss_id) REFERENCES public.client_pss(id);


--
-- Name: queries queries_raised_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_raised_by_id_fkey FOREIGN KEY (raised_by_id) REFERENCES public.users(id);


--
-- Name: queries queries_responsibility_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queries
    ADD CONSTRAINT queries_responsibility_to_id_fkey FOREIGN KEY (responsibility_to_id) REFERENCES public.users(id);


--
-- Name: query_approvals query_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_approvals
    ADD CONSTRAINT query_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: query_approvals query_approvals_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_approvals
    ADD CONSTRAINT query_approvals_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.queries(id) ON DELETE CASCADE;


--
-- Name: query_approvals query_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_approvals
    ADD CONSTRAINT query_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: requests requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: requests requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: requests requests_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: trip_approvals trip_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_approvals
    ADD CONSTRAINT trip_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: trip_approvals trip_approvals_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trip_approvals
    ADD CONSTRAINT trip_approvals_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trips trips_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: trips trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict SlGIJg8rS0RqYJbyxDPte3TyxyFbIqIWPIjlLyQhZTLFcceBLXOurDSBjoLia1f

