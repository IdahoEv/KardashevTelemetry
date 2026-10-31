select
    install_id::varchar as install_id,
    props.milestone_id as milestone_id,
    min(props.ticked_time_s) as ticked_time_s
from read_json_auto('$SESSIONS', union_by_name = true)
where event = 'milestone_reached'
group by install_id, props.milestone_id
order by install_id, milestone_id
