export default {
  private: {
    endpoint: process.env.ATOKA_MATCH,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true,
    min_threshold: 0.6
  },
  public: {
    name: 'Atoka Match',
    description: 'Questo servizio viene utilizzato per trovare la corrispondenza tra i dati che si hanno a disposizione (source data) e le aziende presenti in Atoka.',
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
        id: 'atokaName',
        description: "<br><h3>name</h3>La colonna selezionata nella tabella <b>Source</b> verrà matchata con <b>Atoka</b>:",
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : name', 'value': 'value' }]
      },


      {
        id: 'regNumbers',
        description: '<hr style="width:105%"> <br><h2>Relevant Filters</h2>  di seguito è possibile configurare i relevant filter, filtri importanti all\'interno del servizio che richiede l\'utilizzo di almeno uno di questi (name compreso). <br><br><hr style="width:105%; border:1px solid #e0e0e0;"><h3>regNumbers</h3>Per utilizzare il filtro regNumbers selezionare la colonna <b>source</b>:',
        label: 'Source : regNumbers',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaRegNumber',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : regNumbers', 'value': 'value' }]
      },




      {
        id: 'websitesDomains',
        description: '<hr style="width:112%; border:1px solid #e0e0e0;"> <h3>websitesDomains</h3>Per utilizzare il filtro websitesDomains selezionare la colonna <b>source</b>:',
        label: 'Source : websitesDomains',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaWebsitesDomains',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : websitesDomains', 'value': 'value' }]
      },






      {
        id: 'phones',
        description: '<hr style="width:132%; border:1px solid #e0e0e0;"> <h3>phones</h3>Per utilizzare il filtro phones selezionare la colonna <b>source</b>:',
        label: 'Source : phones',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaPhones',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : phones', 'value': 'value' }]
      },



      {
        id: 'emails',
        description: '<hr style="width:134%; border:1px solid #e0e0e0;"> <h3>emails</h3>Per utilizzare il filtro emails selezionare la colonna <b>source</b>:',
        label: 'Source : emails',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaEmails',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : emails', 'value': 'value' }]
      },



      {
        id: 'socials',
        description: '<hr style="width:132%; border:1px solid #e0e0e0;"> <h3>socials</h3>Per utilizzare il filtro socials selezionare la colonna <b>source</b>:',
        label: 'Source : socials',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaSocials',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : socials', 'value': 'value' }]
      },




      {
        id: 'opt1',
        description: '<hr style="width:105%"> <h2>Optional Filters</h2> <br> di seguito è possibile configurare gli optional filter, filtri che permettono di essere più precisi nella ricerca, ma che non hanno vincoli di utilizzo. <br><br><hr style="width:105%; border:1px solid #e0e0e0;"><h3>Optional 1</h3>Per utilizzare il primo filtro opzionale selezionare la colonna <b>source</b>:',
        label: 'Source : Optional 1',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'optField1',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka : Optional 1",
        infoText: "",
        inputType: 'text',
        defaultValue: '',
        rules: []
      },
  

      {
        id: 'opt2',
        description: '<hr style="width:217%; border:1px solid #e0e0e0;"> <h3>Optional 2</h3>Per utilizzare il secondo filtro opzionale selezionare la colonna <b>source</b>:',
        label: 'Source : Optional 2',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'optField2',
        description: 'che verrà matchata con <b>Atoka</b>:',
        label: "Atoka : Optional 2",
        infoText: "",
        inputType: 'text',
        defaultValue: '',
        rules: []
      }
    ]
  }
}