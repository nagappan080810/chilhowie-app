import bcrypt from 'bcryptjs'

const password = process.argv[2]
if (!password || password.length < 12) {
  console.error('Provide a password of at least 12 characters: node scripts/hash-password.ts "your-long-password"')
  process.exit(1)
}

bcrypt.hash(password, 12).then((hash) => console.log(hash)).catch((error: unknown) => {
  console.error('Unable to create the password hash.', error)
  process.exitCode = 1
})
