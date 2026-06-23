/** 将全角字符转为半角，并统一为小写邮箱（登录/注册前调用） */
export function normalizeAuthEmail(email: string): string {
  return email
    .trim()
    .replace(/\u3000/g, ' ')
    .replace(/[\uff01-\uff5e]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .trim()
    .toLowerCase()
}
