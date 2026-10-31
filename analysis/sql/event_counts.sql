select
    event,
    count(*) as count
from read_json_auto('$SESSIONS', union_by_name = true)
group by event
order by count desc, event
