export default {
  private: {
    endpoint: process.env.ATOKA_MATCH,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true
  },
  public: {
    name: 'Atoka Match',
    description: 'Use this service when you need to match some data you already have with the detailed information in our database, for example to enrich your archives, or to ensure you have up-to-date data.',
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
    formParams: [
      {
        id: 'regNumber',
        description: 'Select the reg number column:',
        label: 'Reg Number',
        infoText: 'Select one column as a Reg Number Field',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'websitesDomains',
        description: 'Select the Websites Domains column:',
        label: 'Websites Domains',
        infoText: 'Select one column as a Websites Domains Field',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'phones',
        description: 'Select the phones column:',
        label: 'Phones',
        infoText: 'Select one column as a phones Field',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'emails',
        description: 'Select the e-mails column:',
        label: 'e-mail',
        infoText: 'Select one column as a e-mail Field',
        inputType: 'selectColumns',
        rules: ['required']
      },
      {
        id: 'socials',
        description: 'Select the socials column:',
        label: 'Social',
        infoText: 'Select one column as a socials Field',
        inputType: 'selectColumns',
        rules: ['required']
      }
    ]
  }
}