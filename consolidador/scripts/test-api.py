import urllib.request,urllib.error,http.cookiejar,json,copy
base='http://localhost:5173'
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(path,body=None,origin=base):
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json','Origin':origin})
    try:
        with client.open(req) as r:return r.status,json.loads(r.read())
    except urllib.error.HTTPError as e:
        raw=e.read().decode()
        try: payload=json.loads(raw)
        except json.JSONDecodeError: payload={'error':raw}
        return e.code,payload
client.open(base+'/signin-with-chatgpt?return_to=/').read()
status,initial=call('/api/portfolio');assert status==200
assert len(initial['notes'])==91
status,res=call('/api/portfolio',{'action':'import'});assert status==200 and '0 documentos novos' in res['message']
status,again=call('/api/portfolio');assert len(again['movements'])==140
note=copy.deepcopy(again['notes'][0]);before=copy.deepcopy(note)
status,res=call('/api/portfolio',{'action':'save','note':note});assert status==200,res
status,res=call('/api/portfolio',{'action':'save','note':before});assert status==409,res
note['trades'][0]['quantity']='0';status,res=call('/api/portfolio',{'action':'save','note':note});assert status==400,res
status,res=call('/api/portfolio',{'action':'import'},'https://other.invalid');assert status==403
status,res=call('/api/market',{});assert status==503 and 'BRAPI_API_KEY' in res['error']
status,final=call('/api/portfolio');assert len(final['notes'])==91 and len(final['movements'])==140
print(json.dumps({'idempotent_import':True,'save':True,'stale_update_rejected':True,'invalid_quantity_rejected':True,'cross_origin_rejected':True,'missing_market_key_handled':True,'documents':91,'movements':140}))
