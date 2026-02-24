# Data Schema (Postgres)

## sessions
id (uuid, pk)
created_at
last_seen_at
user_agent
ip_hash

## designs
id (uuid, pk)
session_id (fk)
input_mode
category_hint
text_prompt
input_image_url
input_image_sha256
status
created_at

## jobs
id (uuid, pk)
design_id (fk)
job_type
status
progress
result (jsonb)
error_code
created_at
finished_at

## design_profiles
id (uuid, pk)
design_id (fk)
profile_hash (unique)
profile (jsonb)
keywords (text[])
negative_keywords (text[])
dominant_color
embedding (bytea)
created_at

## providers
id (text pk)
name
base_url
enabled

## search_runs
id (uuid pk)
profile_id (fk)
provider_id (fk)
status
created_at

## search_results
id (uuid pk)
search_run_id (fk)
title
image_url
product_url
price
score_overall
score_embedding
score_color
score_keyword
explanation (text[])
created_at

---

# Redis Keys

session: fmd:{env}:session:{session_id}
job: fmd:{env}:job:{job_id}
profile: fmd:{env}:profile:{profile_hash}
search: fmd:{env}:search:{profile_hash}:{provider}
lock: fmd:{env}:lock:process:{design_id}
queue: fmd:{env}:queue:process
