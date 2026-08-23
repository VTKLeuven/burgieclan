#!/usr/bin/env python3
"""
01_crawl_seafile.py
Extracts the complete file inventory from Seafile 13 for the 30 root parent libraries.
Runs inside the `seafile` container on 10.10.10.27.
"""

import os
import sys
import json
import time
import queue
from concurrent.futures import ThreadPoolExecutor, as_completed

# Set up Seafile Python environment
sys.path.append('/opt/seafile/seafile-server-13.0.25/seafile/lib/python3/site-packages')
sys.path.append('/opt/seafile/seafile-server-13.0.25/seahub/thirdpart')
sys.path.append('/opt/seafile/seafile-server-13.0.25/seahub')

os.environ['CCNET_CONF_DIR'] = '/opt/seafile/ccnet'
os.environ['SEAFILE_CONF_DIR'] = '/opt/seafile/seafile-data'
os.environ['SEAFILE_CENTRAL_CONF_DIR'] = '/opt/seafile/conf'
os.environ['SEAFILE_RPC_PIPE_PATH'] = '/opt/seafile/seafile-server-13.0.25/runtime'

from seaserv import seafile_api
import pymysql


def get_db_credentials():
    conf_path = '/opt/seafile/conf/seafile.conf'
    user = 'root'
    password = ''
    host = 'seafile-mysql'
    port = 3306
    
    if os.path.exists(conf_path):
        with open(conf_path, 'r') as f:
            in_db = False
            for line in f:
                line = line.strip()
                if line == '[database]':
                    in_db = True
                elif in_db and line.startswith('['):
                    break
                elif in_db:
                    if line.startswith('user'):
                        user = line.split('=')[1].strip()
                    elif line.startswith('password'):
                        password = line.split('=')[1].strip()
                    elif line.startswith('host'):
                        host = line.split('=')[1].strip()
                    elif line.startswith('port'):
                        port = int(line.split('=')[1].strip())
                        
    return host, port, user, password


def get_parent_libraries():
    host, port, user, password = get_db_credentials()
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database='seafile-db',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    query = """
    SELECT r.repo_id, COALESCE(i.name, 'NO_NAME') AS name, COALESCE(s.size, 0) AS size, COALESCE(c.file_count, 0) AS file_count
    FROM `seafile-db`.RepoOwner o
    JOIN `seafile-db`.Repo r ON r.repo_id = o.repo_id
    LEFT JOIN `seafile-db`.RepoInfo i ON i.repo_id = r.repo_id
    LEFT JOIN `seafile-db`.RepoSize s ON s.repo_id = r.repo_id
    LEFT JOIN `seafile-db`.RepoFileCount c ON c.repo_id = r.repo_id
    LEFT JOIN `seafile-db`.VirtualRepo v ON v.repo_id = r.repo_id
    WHERE o.owner_id = 'it@vtk.be' AND v.repo_id IS NULL
    ORDER BY s.size DESC;
    """
    
    with conn.cursor() as cursor:
        cursor.execute(query)
        libraries = cursor.fetchall()
        
    conn.close()
    return libraries


def crawl_library(lib):
    repo_id = lib['repo_id']
    repo_name = lib['name']
    files = []
    
    # Queue for BFS traversal
    q = ['/']
    
    while q:
        curr_path = q.pop(0)
        try:
            entries = seafile_api.list_dir_by_path(repo_id, curr_path)
            if not entries:
                continue
                
            for entry in entries:
                name = entry.obj_name
                sub_path = curr_path.rstrip('/') + '/' + name
                
                # Check if entry is a directory (type 2 in Seafile RPC, or check is_dir)
                is_directory = getattr(entry, 'is_dir', False) or entry.mode == 0o040000 or (hasattr(entry, 'type') and entry.type == 2)
                
                if is_directory:
                    q.append(sub_path)
                else:
                    ext = name.split('.')[-1].lower() if '.' in name else ''
                    size = getattr(entry, 'size', 0)
                    mtime = getattr(entry, 'mtime', 0)
                    file_id = getattr(entry, 'obj_id', '') or getattr(entry, 'id', '')
                    
                    files.append({
                        'repo_id': repo_id,
                        'repo_name': repo_name,
                        'path': sub_path,
                        'filename': name,
                        'extension': ext,
                        'size_bytes': size,
                        'mtime': mtime,
                        'file_id': file_id,
                    })
        except Exception as e:
            sys.stderr.write(f"Error reading {repo_name} at {curr_path}: {e}\n")
            
    return repo_name, files


def main():
    print("=== Seafile 13 Metadata Crawler ===")
    libraries = get_parent_libraries()
    print(f"Found {len(libraries)} parent libraries owned by it@vtk.be")
    
    output_file = '/tmp/manifest_raw.jsonl'
    all_files = []
    total_bytes = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(crawl_library, lib): lib for lib in libraries}
        
        for future in as_completed(futures):
            repo_name, files = future.result()
            lib_bytes = sum(f['size_bytes'] for f in files)
            print(f"  ✓ {repo_name: <45} -> {len(files): >5} files ({lib_bytes / (1024**2): >8.1f} MB)")
            all_files.extend(files)
            total_bytes += lib_bytes

    print(f"\nWriting {len(all_files)} records to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in all_files:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    elapsed = time.time() - start_time
    print(f"\n=== Crawl Complete in {elapsed:.2f}s ===")
    print(f"Total parent libraries: {len(libraries)}")
    print(f"Total files indexed:   {len(all_files):,}")
    print(f"Total size:            {total_bytes / (1024**3):.2f} GB")


if __name__ == '__main__':
    main()
