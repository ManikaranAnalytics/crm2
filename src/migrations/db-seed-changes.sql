-- 1. Add KAM role if it does not already exist
INSERT INTO roles (name)
VALUES ('KAM')
ON CONFLICT (name) DO NOTHING;

-- 2. Make Vaishali, Himanshu, and Bhupendra Managers
UPDATE users
   SET role_id = (
       SELECT id
         FROM roles
        WHERE name = 'MANAGER'
   )
 WHERE name IN (
       'Vaishali',
       'Himanshu S',
       'Bhupendra'
 );

-- 3. Add three KAM users
INSERT INTO users (
    name,
    email,
    role_id,
    is_active
)
VALUES
(
    'Ravi KAM',
    'ravi.kam@manikarananalytics.in',
    (SELECT id FROM roles WHERE name = 'KAM'),
    TRUE
),
(
    'Priya KAM',
    'priya.kam@manikarananalytics.in',
    (SELECT id FROM roles WHERE name = 'KAM'),
    TRUE
),
(
    'Arjun KAM',
    'arjun.kam@manikarananalytics.in',
    (SELECT id FROM roles WHERE name = 'KAM'),
    TRUE
)
ON CONFLICT (email) DO NOTHING;
