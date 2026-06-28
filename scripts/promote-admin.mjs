import process from 'node:process'
import { ensureDefaultAdmins, findUserByEmail, openUserDatabase, setUserAdminByEmail } from './lib/user-db.mjs'

const emails = process.argv.slice(2)
if (emails.length === 0) {
  console.error('Usage: node scripts/promote-admin.mjs <email> [email...]')
  process.exit(1)
}

const db = openUserDatabase()
ensureDefaultAdmins(db)

for (const raw of emails) {
  const email = raw.trim().toLowerCase()
  const user = findUserByEmail(db, email)
  if (!user) {
    console.warn(`[promote-admin] 未找到账号：${email}（请先注册）`)
    continue
  }
  setUserAdminByEmail(db, email, true)
  console.log(`[promote-admin] 已设为管理员：${email}`)
}
