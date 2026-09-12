import test from 'node:test'
import assert from 'node:assert/strict'
import { UpyunSession } from '../server/upyun.js'
import {
  buildPublicUrl, getItemNameFromPath, canMovePath, matchesSearch,
  validateItemName, readStoredTasks, isTaskEnded, TASKS_KEY,
} from '../src/lib/upyun-app.js'

test('public links preserve literal special characters and configured domain paths', () => {
  const uri = '/图片/封面 #1?50%+%2F.png'
  const url = new URL(buildPublicUrl({}, { domain: 'https://cdn.example.com/assets' }, uri))
  assert.equal(url.search, '')
  assert.equal(url.hash, '')
  assert.equal(decodeURIComponent(url.pathname), '/assets' + uri)
  assert.equal(getItemNameFromPath('/literal%2Fname.txt'), 'literal%2Fname.txt')
})

test('UpYun API requests encode filenames without turning them into a query or fragment', () => {
  const client = new UpyunSession({ bucketName: 'test-space', operatorName: 'test', password: 'test' })
  try {
    const uri = '/目录/a #?%2F.txt'
    const url = client.getUrl(uri)
    assert.equal(decodeURIComponent(url.pathname), '/test-space' + uri)
    assert.equal(url.search, '')
    assert.equal(url.hash, '')
    assert.equal(client.getUrl({ uri: '/', search: '?usage' }).search, '?usage')
  } finally { client.close() }
})

test('search ignores surrounding whitespace and case but keeps literal symbols', () => {
  assert.equal(matchesSearch({ filename: 'Report #1.PDF' }, '  report #1  '), true)
  assert.equal(matchesSearch({ filename: '报告.pdf' }, '报告'), true)
  assert.equal(matchesSearch({ filename: '报告.pdf' }, '不存在'), false)
})

test('names reject path traversal and control characters while allowing normal filenames', () => {
  for (const name of ['', '   ', '.', '..', '../backup', 'a/b', 'a\\b', 'a\u0000b', 'a\nb']) {
    assert.notEqual(validateItemName(name), '', JSON.stringify(name))
  }
  for (const name of ['文档', ' file name.txt ', '.gitignore', '配置 #1?50%.json']) {
    assert.equal(validateItemName(name), '')
  }
})

test('restored running tasks are interrupted, and settled statuses are preserved', () => {
  const previousStorage = globalThis.localStorage
  const records = [{id:'1',type:'upload',status:'running'}, {id:'2',type:'download',status:'completed'}]
  globalThis.localStorage = { getItem(key) { assert.equal(key, TASKS_KEY); return JSON.stringify(records) } }
  try {
    const tasks = readStoredTasks()
    assert.equal(tasks[0].status, 'interrupted')
    assert.equal(tasks[1].status, 'completed')
    assert.equal(isTaskEnded(tasks[0]), true)
    assert.equal(isTaskEnded({status:'cancelled'}), true)
    assert.equal(isTaskEnded({status:'running'}), false)
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousStorage
  }
})

test('moves cannot target their own folder, descendants, or their existing parent', () => {
  assert.equal(canMovePath('/design/', '/design/'), false)
  assert.equal(canMovePath('/design/', '/design/icons/'), false)
  assert.equal(canMovePath('/design/file.txt', '/design/'), false)
  assert.equal(canMovePath('/design/', '/archive/'), true)
})
