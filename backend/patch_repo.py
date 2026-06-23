import re

file_path = 'app/api/endpoints/repositories.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add current_user to endpoints that are missing it
endpoints_to_fix = [
    'get_repository_documentation',
    'get_repository_build_status',
    'get_repository_failure_analysis',
    'get_repository_similar_failures',
    'get_repository_report',
    'delete_repository',
    'delete_all_repositories'
]

for ep in endpoints_to_fix:
    pattern = re.compile(r'(async def ' + ep + r'\([\s\S]*?db: AsyncSession = Depends\(get_db\)\s*)(\):)')
    content = pattern.sub(r'\1,\n    current_user: User = Depends(get_current_active_user)\n\2', content)

# 2. Add ownership check to all 'if not repo: raise ...' blocks
auth_check = '''
    if repo.user_id and repo.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this repository"
        )'''

repo_check_pattern = re.compile(r'(repo = await repository_repo\.get\(db, id\)\s+if not repo:\s+raise HTTPException\([\s\S]*?detail=f"Repository with ID \{id\} not found"\s+\))')

content = repo_check_pattern.sub(r'\1' + auth_check, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched repositories.py')
