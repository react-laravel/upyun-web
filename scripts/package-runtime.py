#!/usr/bin/env python3
"""Package built UI plus the installed server-only dependency closure."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import tarfile

PRIVATE_NAMES={'.git','.ssh','.npmrc','.gitconfig','auth.json','id_rsa','id_ed25519'}
PRIVATE_KEY=re.compile(rb'-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----')
ROOTS={'express','multer','basic-ftp'}

def package(root, output, closure, revision):
    if not re.fullmatch('[0-9a-f]{40}',revision):raise ValueError('Full SHA required')
    if output.resolve().is_relative_to(root.resolve()):raise ValueError('Archive must be outside checkout')
    if Path(closure['source']).resolve()!=root.resolve():raise ValueError('Dependency source mismatch')
    files={}
    def add(p):
        rel=p.relative_to(root)
        if any(x.startswith('.env') or x in PRIVATE_NAMES for x in rel.parts):raise ValueError('Private path in runtime')
        s=p.lstat()
        if not stat.S_ISREG(s.st_mode) or s.st_size>8*1024*1024:raise ValueError('Unsafe runtime file')
        data=p.read_bytes()
        if PRIVATE_KEY.search(data):raise ValueError('Private key in runtime')
        files[rel.as_posix()]=data
    for name in ['server','dist']:
        start=root/name
        if start.is_symlink() or not start.is_dir():raise ValueError('Missing runtime directory')
        for p in start.rglob('*'):
            if p.is_symlink():raise ValueError('Runtime links forbidden')
            if p.is_file():add(p)
    add(root/'LICENSE')
    versions={}
    lock=json.loads((root/'package-lock.json').read_text())
    selected={}
    for meta in closure['packages']:
        rel=Path(meta['relative'])
        if rel.is_absolute() or '..' in rel.parts or rel.parts[0]!='node_modules':raise ValueError('Unsafe dependency path')
        start=root/rel
        if start.is_symlink() or not start.is_dir():raise ValueError('Dependency must be a real directory')
        installed=json.loads((start/'package.json').read_text())
        if installed['name']!=meta['name'] or installed['version']!=meta['version']:raise ValueError('Installed dependency mismatch')
        if meta['relative']=='node_modules/'+meta['name'] and meta['name'] in ROOTS:versions[meta['name']]=meta['version']
        for folder,dirs,names in os.walk(start):
            if any((Path(folder)/x).is_symlink() for x in dirs):raise ValueError('Dependency directory links forbidden')
            dirs[:]=[x for x in dirs if x!='node_modules']
            for name in names:add(Path(folder)/name)
        record=dict(lock['packages'][meta['relative']]);record.pop('dev',None);selected[meta['relative']]=record
    if set(versions)!=ROOTS:raise ValueError('Server dependency closure incomplete')
    minimal={'name':'upyun-web','version':'0.0.1','private':True,'type':'module','scripts':{'start':'node server/index.js'},'dependencies':versions}
    runtime_lock={'name':'upyun-web','version':'0.0.1','lockfileVersion':3,'requires':True,'packages':{'':{'name':'upyun-web','version':'0.0.1','dependencies':versions},**selected}}
    files['package.json']=(json.dumps(minimal,indent=2)+'\n').encode()
    files['package-lock.json']=(json.dumps(runtime_lock,indent=2)+'\n').encode()
    manifest={'schema':1,'revision':revision,'files':{n:hashlib.sha256(d).hexdigest() for n,d in files.items()}}
    files['deploy-manifest.json']=json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()
    total=sum(map(len,files.values()))
    if total>64*1024*1024:raise ValueError('Expanded runtime too large')
    try:
        with tarfile.open(output,'w:gz',compresslevel=6) as tar:
            for name,data in sorted(files.items()):
                entry=tarfile.TarInfo(name);entry.size=len(data);entry.mode=0o644;entry.mtime=0;tar.addfile(entry,io.BytesIO(data))
        if output.stat().st_size>32*1024*1024:raise ValueError('Compressed runtime too large')
    except BaseException:output.unlink(missing_ok=True);raise
    return {'revision':revision,'files':len(files),'runtime_packages':len(selected),'expanded_bytes':total,'compressed_bytes':output.stat().st_size}

if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit('Usage: package-runtime.py OUTPUT CLOSURE.json SHA')
    print(json.dumps(package(Path.cwd(),Path(sys.argv[1]),json.loads(Path(sys.argv[2]).read_text()),sys.argv[3])))
