-- PostgreSQL database dump (DML only)
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

-- Data insertion begins

--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--
COPY public.roles (id, name, created_at, updated_at) FROM stdin;
1	ADMIN	2025-11-18 13:02:57.543546+05:30	2025-11-18 13:02:57.543546+05:30
3	EMPLOYEE	2025-12-17 10:16:47.885743+05:30	2025-12-17 10:16:47.885743+05:30
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
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--
COPY public.attachments (id, owner_type, owner_id, file_name, file_path, content_type, uploaded_by, uploaded_at) FROM stdin;
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
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
SELECT pg_catalog.setval('public.roles_id_seq', 3, true);

--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
SELECT pg_catalog.setval('public.users_id_seq', 4, true);

-- PostgreSQL database dump complete
