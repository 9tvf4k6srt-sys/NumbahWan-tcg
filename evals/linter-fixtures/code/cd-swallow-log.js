async function load(id) {
  try {
    return await fetchCard(id);
  } catch (err) {
    console.log(err);
  }
}
module.exports = { load };
