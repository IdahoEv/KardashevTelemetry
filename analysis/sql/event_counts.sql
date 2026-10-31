select
    event,
    count(*) as count
from (
    select * from read_json_auto('$SESSIONS', union_by_name = true)
    qualify row_number() over (partition by session_id, seq order by t_ms) = 1
)
group by event
order by count desc, event
