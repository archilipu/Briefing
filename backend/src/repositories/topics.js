export async function createTopic(pool, input) {
  const query = `
    insert into topics (briefing_id, title, description, status)
    values ($1, $2, $3, 'pending')
    returning id, briefing_id, title, description, status, created_at
  `;

  const values = [input.briefingId, input.title, input.description];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function listRankedTopicsByBriefing(pool, briefingId, userId = null) {
  const query = `
    select
      topic_id as id,
      briefing_id,
      title,
      description,
      status,
      created_at,
      vote_count,
      ranking,
      exists (
        select 1
        from votes v
        where v.topic_id = briefing_topic_ranking.topic_id
          and v.briefing_id = briefing_topic_ranking.briefing_id
          and ($2::uuid is not null and v.user_id = $2::uuid)
      ) as user_has_voted
    from briefing_topic_ranking
    where briefing_id = $1
    order by vote_count desc, created_at asc
  `;

  const { rows } = await pool.query(query, [briefingId, userId]);
  return rows;
}

export async function updateTopicStatus(pool, topicId, status) {
  const query = `
    update topics
       set status = $2
     where id = $1
     returning id, briefing_id, title, description, status, created_at
  `;

  const { rows } = await pool.query(query, [topicId, status]);
  return rows[0] || null;
}

export async function listTopicsByBriefing(pool, briefingId) {
  const query = `
    select
      t.id,
      t.briefing_id,
      t.title,
      t.description,
      t.status,
      t.created_at,
      count(v.id)::int as vote_count
    from topics t
    left join votes v
      on v.topic_id = t.id
     and v.briefing_id = t.briefing_id
    where t.briefing_id = $1
    group by t.id
    order by count(v.id) desc, t.created_at asc
  `;

  const { rows } = await pool.query(query, [briefingId]);
  return rows;
}
