function save(record) {
  try {
    persist(record);
  } catch (e) {
  }
}
module.exports = { save };
