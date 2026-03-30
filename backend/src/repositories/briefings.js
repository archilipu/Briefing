export async function listBriefings(pool) {
  const query = `
    select
      b.id,
      b.name,
      b.edition,
      b.briefing_at,
      b.voting_ends_at,
      b.status,
      coalesce(t.topic_count, 0)::int as topic_count,
      coalesce(v.vote_count, 0)::int as vote_count
    from briefings b
    left join (
      select briefing_id, count(*) as topic_count
      from topics
      group by briefing_id
    ) t on t.briefing_id = b.id
    left join (
      select briefing_id, count(*) as vote_count
      from votes
      group by briefing_id
    ) v on v.briefing_id = b.id
    order by b.briefing_at desc
  `;

  const { rows } = await pool.query(query);
  return rows;
}

export async function getPublicBriefing(pool) {
  const query = `
    select
      id,
      name,
      edition,
      briefing_at,
      voting_ends_at,
      status
    from briefings
    where status <> 'archived'
    order by
      case
        when status = 'open' and voting_ends_at > now() then 0
        when status = 'open' then 1
        when status = 'closed' then 2
        when status = 'held' then 3
        else 4
      end,
      briefing_at asc
    limit 1
  `;

  const { rows } = await pool.query(query);
  return rows[0] || null;
}

export async function createBriefing(pool, input) {
  const query = `
    insert into briefings (name, edition, briefing_at, voting_ends_at, status)
    values ($1, $2, $3, $4, $5)
    returning id, name, edition, briefing_at, voting_ends_at, status, created_at
  `;

  const values = [
    input.name,
    input.edition,
    input.briefingAt,
    input.votingEndsAt,
    input.status
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function getBriefingById(pool, briefingId) {
  const query = `
    select id, name, edition, briefing_at, voting_ends_at, status, created_at
    from briefings
    where id = $1
  `;

  const { rows } = await pool.query(query, [briefingId]);
  return rows[0] || null;
}

export async function updateBriefing(pool, briefingId, input) {
  const query = `
    update briefings
       set briefing_at = $2,
           voting_ends_at = $3,
           status = $4
     where id = $1
     returning id, name, edition, briefing_at, voting_ends_at, status, created_at
  `;

  const values = [
    briefingId,
    input.briefingAt,
    input.votingEndsAt,
    input.status
  ];

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

export async function deleteBriefing(pool, briefingId) {
  const query = `
    delete from briefings
    where id = $1
    returning id
  `;

  const { rows } = await pool.query(query, [briefingId]);
  return rows[0] || null;
}
