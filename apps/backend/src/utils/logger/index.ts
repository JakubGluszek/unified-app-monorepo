export const log = (message: any) => {
  let msg = message;
  if (typeof msg === 'object') {
    msg = JSON.stringify(msg);
  }
  const timestamp = new Date().toLocaleString();
  console.log(timestamp, msg);
};
