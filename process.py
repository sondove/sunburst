# Grab our libraries
from novem import Plot
import pandas as pd
import numpy as np

# formatting options for printing dataframes in the termintal
pd.set_option('display.max_columns', 50)
pd.set_option('display.max_rows', 50)
pd.set_option('display.width', None)

# read the mock.csv data
df = pd.read_csv("mock.csv")

# Calculate distance to target maturity
df['dist'] = df['target_maturity'] - df['current_maturity']

# but for demo purpose let's override it with a random value
df['dist'] = np.random.randint(1, 6, size=len(df))


# construct a new dataframe subcat by only getting our subcategory rows
# along with the id and the "distance" to maturity
subcat = df.loc[df['type'] == 'subcategory', ['id','dist']]


# create a utility function to replace the id with a underscore separated hierarchy
def to_id(df):
  df['id'] = df['id'].str.replace('.','_', regex=False) # add underline sep
  df['id'] = df['id'].str.replace('-','_', regex=False) # and last id
  df['id'] = df['id'].str.replace('^CSF_','', regex=True) # and strip static pfx

  return df

# use the to_id function to create a new dataframe with th emodified id column
scat = to_id(subcat)

# set the id column as index (so the id becomes the first column)
scat = scat.set_index('id')


# Create novem plot
plt = Plot('control_maturity_sunburst')

# set chart type to be custom
plt.type = "custom"

# give the plot a name and a descriptive summary
plt.name = "Control Maturity"
plt.summary = "Sunburst chart that shows the control maturity gaps"

# push data to novem
plt.data = scat

# share the plot with minerva (chatbot)
plt.shared += 'chat'


if True:
  # add our custom ccs and javascript
  with open('./custom_sunburst/custom.js', 'r') as f:
    plt.api_write('/config/custom/custom.js', f.read())

  # add our custom ccs and javascript
  with open('./custom_sunburst/custom.css', 'r') as f:
    plt.api_write('/config/custom/custom.css', f.read())





# Create a simple barchart that shows sum distance to target by category

# create a new dataframe with a normalized id
qq = to_id(df)

# grab id and name for all categories
qqc = qq.loc[qq['type'] == 'category', ['id','name']]

# give them a new headers
qqc.columns = ['lbl', 'cat']

# grab id, name and dist from subcategories
qqs = qq.loc[qq['type'] == 'subcategory', ['id','name','dist']]

# add lbl column we can match cats on 
qqs['lbl'] = qqs['id'].str[:5]

# merge our data
qqm = pd.merge(qqs, qqc, on='lbl', how='left')

# aggregate data
qqd = qqm.groupby('cat')['dist'].sum()



# Create novem plot
plt = Plot('contol_deviation_by_category')

# set chart type to be custom
plt.type = "bar"

# give the plot a name and a descriptive summary
plt.name = "Control Maturity Distance by Category"
plt.summary = "Barchart that shows the control maturity distances grouped by category"

# push data to novem
plt.data = qqd

# share the plot with minerva (chatbot)
plt.shared += 'chat'

