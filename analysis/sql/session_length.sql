select
    session_id::varchar as session_id,
    max(t_ms) / 1000.0 as length_s,
    count(*) as events
from (
    select * from read_json_auto('$SESSIONS', union_by_name = true)
    qualify row_number() over (partition by session_id, seq order by t_ms) = 1
)
group by session_id
order by session_id
