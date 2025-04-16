import numpy as np

np.savez('test.npz', **dict(a = 1, b =2), allow_pickle=True)
