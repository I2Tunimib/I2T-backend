const relevantOpt = [{ 'id': '', 'label': ' ', 'value': '' }, { 'id': 'name', 'label': 'Atoka : name', 'value': 'name' }, { 'id': 'regNumbers', 'label': 'Atoka : regNumbers', 'value': 'regNumbers' },
{ 'id': 'websitesDomains', 'label': 'Atoka : websitesDomains', 'value': 'websitesDomains' }, { 'id': 'phones', 'label': 'Atoka : phones', 'value': 'phones' },
{ 'id': 'emails', 'label': 'Atoka : emails', 'value': 'emails' }, { 'id': 'socials', 'label': 'Atoka : socials', 'value': 'socials' }];

const optionalOpt = [{ 'id': '', 'label': ' ', 'value': '' }, { 'id': 'countries', 'label': 'Atoka : countries', 'value': 'countries' },
{ 'id': 'active', 'label': 'Atoka : active', 'value': 'active' }, { 'id': 'groupIds', 'label': 'Atoka : groupIds', 'value': 'groupIds' },
{ 'id': 'revenueRange', 'label': 'Atoka : revenueRange', 'value': 'revenueRange' }, { 'id': 'provinces', 'label': 'Atoka : provinces', 'value': 'provinces' },
{ 'id': 'municipalities', 'label': 'Atoka : municipalities', 'value': 'municipalities' },
{ 'id': 'postcodes', 'label': 'Atoka : postcodes', 'value': 'postcodes' }, { 'id': 'address', 'label': 'Atoka : address', 'value': 'address' },
{ 'id': 'useFullAddress', 'label': 'Atoka : useFullAddress', 'value': 'useFullAddress' }];

export default {
  private: {
    endpoint: process.env.ATOKA_MATCH,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: false,
    min_threshold: 0.6
  },
  public: {
    name: 'Atoka Company Match',
    description: 'Atoka is a platform that allows people to know everything about Italian companies. This service allows reconciliation of the entity corresponding to the company contained in the Table  within the Atoka knowledge graph.',
    relativeUrl: '/atoka',
    prefix: 'atoka',
    uri: 'https://atoka.io/public/en/company/-/',
    metaToView: {
      id: {
        label: 'ID',
      },
      name: {
        label: 'Name',
        type: 'link'
      },
      score: {
        label: 'Score'
      },
      type: {
        label: 'Types',
        type: 'subList'
      },
      match: {
        label: 'Match',
        type: 'tag'
      }
    },
    formSchema:{
      firstFilter: {
        title: "<h2>Starting Filter</h2>",
        description: "Select the <b style='color: #3498db ; font-size: 20px;'>type</b> of data in the table column.",
        component: "group",
        dynamic: false,
        fields : {
          column: {
            label : "Table Column",
            component: "select",
            rules: ['required'],
            options: [{ 'id': 'colonnaSpec', 'label': 'company_name', 'value': 'company_name' }]
          },
          type: {
            label: "Data Type",
            component: "select",
            rules: ['required'],
            options: relevantOpt
          }
        }
      },
      relevantFilter: {
        title: "<h2>Relevant Filter</h2>",
        description: "The filter requires the table <b style='color: #FF5733; font-size: 20px;'>column</b> to be used and the <b style='color: #3498db ; font-size: 20px;'>type</b> of data it contains.",
        component: "group",
        dynamic: true,
        fields : {
          column: {
            label : "Table Column",
            component: "selectColumns"
          },
          type: {
            label: "Data Type",
            component: "select",
            options: relevantOpt
          }
        }
      },
      optionalFilter: {
        title: "<h2>Optional Filter</h2>",
        component: "group",
        description: "The filter requires the table <b style='color: #FF5733; font-size: 20px;'>column</b> to be used and the <b style='color: #3498db ; font-size: 20px;'>type</b> of data it contains.",
        dynamic: true,
        fields : {
          column: {
            label : "Table Column",
            component: "selectColumns"
          },
          type: {
            label: "Data Type",
            component: "select",
            options: optionalOpt
          }
        }
      }
    }
  }
}