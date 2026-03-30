export async function castVote(pool, input) {
  const query = `
    select *
    from cast_vote($1::uuid, $2::uuid, $3::uuid)
  `;

  const values = [input.userId, input.topicId, input.briefingId];
  const { rows } = await pool.query(query, values);
  return rows[0];
}
