select
    session_id::varchar as session_id,
    max(t_ms) / 1000.0 as length_s,
    count(*) as events
from read_json_auto('$SESSIONS', union_by_name = true)
group by session_id
order by session_id
