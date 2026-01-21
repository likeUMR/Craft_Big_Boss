import requests
import json
import os

def crawl_mentors_via_api():
    # 使用用户提供的 API
    # 设置 limit=300 确保一次性获取所有数据
    api_url = "https://www.bjzgca.edu.cn/api/teacher"
    params = {
        "type": "tutor",
        "page": 1,
        "limit": 300,
        "orderBy": "sort1"
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Referer": "https://www.bjzgca.edu.cn/faculty"
    }
    
    print(f"正在请求 API: {api_url}")
    try:
        response = requests.get(api_url, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        res_json = response.json()
        raw_data = res_json.get('data', [])
    except Exception as e:
        print(f"请求失败: {e}")
        return

    print(f"成功获取到 {len(raw_data)} 条原始数据。")
    
    mentors_list = []
    excluded_count = 0
    
    for item in raw_data:
        name = item.get('name', '').strip()
        source = item.get('source', '') or ''
        position = item.get('position', '') or ''
        
        # 排除所有共建导师
        if "共建导师" in source or "共建导师" in position:
            excluded_count += 1
            continue
            
        # 提取头像链接 (补全域名，并将空格替换为 %20)
        avatar = item.get('pic', '')
        if avatar:
            avatar = avatar.replace(' ', '%20')
            if not avatar.startswith('http'):
                # 根据用户反馈，头像路径需要通过 /adminapi 访问
                avatar = "https://www.bjzgca.edu.cn/adminapi" + avatar
            
        # 提取主页链接
        homepage = item.get('link', '')
        if not homepage:
            uuid = item.get('uuid')
            if uuid:
                homepage = f"https://www.bjzgca.edu.cn/teacher/{uuid}"
        
        mentors_list.append({
            "name": name,
            "avatar": avatar,
            "homepage": homepage
        })

    # 保存为 JSON (修改输出路径)
    output_path = r'D:\PROJECT\VSCode\AI+Game\Craft_Big_Boss\src\data\mentors.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(mentors_list, f, ensure_ascii=False, indent=4)
    
    print(f"处理完成：")
    print(f"- 排除共建导师: {excluded_count} 位")
    print(f"- 最终保存导师: {len(mentors_list)} 位")
    print(f"- 数据已保存至: {output_path}")

if __name__ == "__main__":
    crawl_mentors_via_api()
