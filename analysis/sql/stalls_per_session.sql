select
    session_id::varchar as session_id,
    count(*) filter (where event = 'building_stalled') as stalls
from read_json_auto('$SESSIONS', union_by_name = true)
group by session_id
order by session_id
