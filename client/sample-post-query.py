import urllib
data = """12737/001/xjoe
12738/001
12739
12740//xjoe
12740,12741,12742"""
resp  = urllib.urlopen("http://127.0.0.1:9839/mds/?v=001&rt=xjoe", data)
print resp.read()
