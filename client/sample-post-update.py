import urllib
data = """12737/001/xjoe=I am a random test body for 12737/xjoe
12738/001/xjoe=I am a random test body for 12738/xjoe
12739/001/xjoe=I am a random test body for 12739/xjoe
12740/001/xjoe=I am a random test body for 12740/xjoe
12741/001/xjoe=I am a random test body for 12741/xjoe
12742/001/xjoe=I am a random test body for 12742/xjoe
12743/001/xjoe=I am a random test body for 12743/xjoe
12744/001/xjoe=I am a random test body for 12744/xjoe"""
resp  = urllib.urlopen("http://127.0.0.1:9839/add", data)
print resp.read()
