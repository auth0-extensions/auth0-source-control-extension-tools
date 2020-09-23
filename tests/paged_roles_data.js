
let page1 = []; // eslint-disable-line
let page2 = []; // eslint-disable-line
for (let i = 1; i <= 80; i++) {
  const role = {
    name: 'myRole-' + i,
    id: 'myRoleId-' + i,
    description: 'myDescription-' + i
  };
  if (i <= 50) {
    page1.push(role);
  } else {
    page2.push(role);
  }
}

module.exports = {
  roles_page_1: page1,
  roles_page_2: page2
};
