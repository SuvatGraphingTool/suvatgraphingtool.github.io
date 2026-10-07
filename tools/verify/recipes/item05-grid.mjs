// "Interesting ones" — the group the deletions and additions land in.
// Items 5 and 8.
export default [
  { name: 'item05-look-group', el: '.pgroup:last-child',
    run: async (p, { wait }) => { await wait(700); } },
  { name: 'item05-platform-group', el: '.pgroup:nth-child(2)',
    run: async (p, { wait }) => { await wait(700); } },
];
