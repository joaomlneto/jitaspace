export const sanitizeFormattedEveString = (str: string): string => {
  // FIXME: IS THIS CORRECT? THIS WILL CONSIDER THAT THE WHOLE THING IS A "UNICODE BLOCK".
  //        THIS MIGHT BREAK BADLY IF MULTIPLE BLOCKS ARE ALLOWED TO EXIST WITHIN THE STRING!
  if (str.startsWith("u'") && str.endsWith("'")) {
    str = str.slice(2, -1);
    str = str.replaceAll(/\\x[0-9a-fA-F]{2}/g, (str) => {
      const charCode = parseInt(str.slice(2), 16);
      return String.fromCharCode(charCode);
    });
    str = str.replaceAll(/\\'/g, "'");
  }
  // replace unicode escape sequences with actual characters
  str = str.replaceAll(/\\u[0-9a-fA-F]{4}/g, (s) =>
    decodeURIComponent(JSON.parse(`"${s}"`) as string),
  );
  return str;
};
