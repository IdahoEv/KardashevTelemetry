select
    install_id::varchar as install_id,
    props.milestone_id as milestone_id,
    min(props.elapsed_sim_time_s) as time_to_goal_s
from read_json_auto('$SESSIONS', union_by_name = true)
where event = 'milestone_reached'
group by install_id, props.milestone_id
order by install_id, milestone_id
