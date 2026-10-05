// What error reports may carry: enough to fix the bug, nothing about who hit it
export const privacy = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ['user-agent'] },
    httpBodies: []
  },
  // Our TfL key rides along in the query string of every call we make to them
  beforeSend: <T>(event: T): T =>
    JSON.parse(JSON.stringify(event).replace(/(app_key=)[^&#"\\\s]*/g, '$1…'))
};
