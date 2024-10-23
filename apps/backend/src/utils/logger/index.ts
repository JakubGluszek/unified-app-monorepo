export const log = (message: any) => {
  let msg = message;
  if (typeof msg === 'object') {
    msg = JSON.stringify(msg);
  }
  console.log(msg);
};
