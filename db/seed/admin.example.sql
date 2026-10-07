DELETE FROM admin_users
WHERE email = 'bikashgurung.official@gmail.com';

INSERT INTO admin_users (email, password_hash, name) 
VALUES ('bikashgurung.official@gmail.com', 'pbkdf2$sha256$100000$+Yw1FIntXrWy9OVALKk8Ag==$NqNwl4MO07zM46AtjgcDcpbs7u1m4J4J7RZ43r2uVwY=', 'Admin');

