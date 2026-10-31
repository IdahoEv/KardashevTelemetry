select
    session_id::varchar as session_id,
    count(*) filter (where event = 'building_stalled') as stalls
from (
    select * from read_json_auto('$SESSIONS', union_by_name = true)
    qualify row_number() over (partition by session_id, seq order by t_ms) = 1
)
group by session_id
order by session_id
